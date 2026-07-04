import type { VramInfo } from '../utilities/vram-prediction';
import { createLogger } from '../utilities/logger';

const log = createLogger('vram-utils');

// ---------------------------------------------------------------------------
// GPU VRAM measurement (main process, koffi FFI)
//
// Two in-process reads, both validated on real hardware:
//   • TRUE TOTAL — registry HardwareInformation.qwMemorySize (REG_QWORD) under
//     the display-adapter Class key, read via advapi32. This is the accurate
//     64-bit dedicated-VRAM size; WMI Win32_VideoController.AdapterRAM is broken
//     (truncates ~4 GB). Pick the adapter with the largest total = the dGPU.
//   • LIVE USED — PDH "\GPU Adapter Memory(*)\Dedicated Usage", the system-wide
//     dedicated VRAM in use per adapter (what Task Manager shows), read via
//     PdhAddEnglishCounterW (language-neutral) + the wildcard array getter; take
//     the busiest instance = the dGPU during gameplay.
//
// Consumed by the pre-flight/UI guardrail (see utilities/vram-prediction.ts).
// Every failure degrades gracefully: total-unknown or used-unknown returns a
// VramInfo the predictor treats as 'unknown' and FAILS OPEN (no warning/block),
// which matches the chosen warn-and-allow UX — we deliberately do NOT fabricate
// a conservative total, since that would manufacture false positives.
// ---------------------------------------------------------------------------

const CLASS_PATH =
	'SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}';

// --- Win32 constants ---
const HKEY_LOCAL_MACHINE = 0x80000002;
const KEY_READ = 0x20019;
const RRF_RT_QWORD = 0x48; // REG_QWORD or 8-byte REG_BINARY
const RRF_RT_REG_SZ = 0x02;
const ERROR_SUCCESS = 0;
const ERROR_MORE_DATA = 234;
const PDH_FMT_LARGE = 0x400;
const PDH_MORE_DATA = 0x800007d2;
// PDH_FMT_COUNTERVALUE_ITEM_W on x64: LPWSTR szName(8) + PDH_FMT_COUNTERVALUE
// { DWORD CStatus(4) + pad(4) + LONGLONG largeValue(8) } = 24 bytes.
const PDH_ITEM_SIZE = 24;
const PDH_ITEM_CSTATUS_OFFSET = 8;
const PDH_ITEM_VALUE_OFFSET = 16;
// PDH counter-item status codes.
const PDH_CSTATUS_VALID_DATA = 0x0;
const PDH_CSTATUS_NEW_DATA = 0x1;

export interface UsedInstance {
	instanceName: string;
	bytes: number;
}

// A PDH counter item is usable when its CStatus is VALID_DATA or NEW_DATA. The old
// code accepted only VALID_DATA (0) and dropped NEW_DATA (1) — a driver reporting
// NEW_DATA on the single collect would null out readUsed and silently disable the
// VRAM guardrail (cq-capture-path#4). Pure + exported for unit testing (no FFI).
export function isValidPdhStatus(cstatus: number): boolean {
	return (
		cstatus === PDH_CSTATUS_VALID_DATA || cstatus === PDH_CSTATUS_NEW_DATA
	);
}

// Pick the dGPU's live usage from the per-adapter PDH instances (cq-capture-path#1).
// A card can never use more DEDICATED VRAM than it physically has, so any instance
// whose usage exceeds the chosen dedicated `totalBytes` is provably a FOREIGN
// adapter and is excluded — this kills the multi-GPU false positive where the
// global-busiest instance belonged to a different card than `total`, making
// assessVram's freeBytes = max(0, total - used) clamp to 0 and over-warn. Returns
// the busiest of the plausible set; falls back to the global busiest when the
// filter empties (total unknown = 0, or — impossibly — every instance over-total).
// Pure + exported for unit testing (no FFI).
export function selectUsedInstance(
	instances: UsedInstance[],
	totalBytes: number
): UsedInstance | null {
	if (!instances || instances.length === 0) {
		return null;
	}
	const busiest = (list: UsedInstance[]): UsedInstance =>
		list.reduce((a, b) => (b.bytes > a.bytes ? b : a));

	if (totalBytes > 0) {
		const plausible = instances.filter((inst) => inst.bytes <= totalBytes);
		if (plausible.length > 0) {
			return busiest(plausible);
		}
	}
	return busiest(instances);
}

interface VramNative {
	readTotal(): { totalBytes: number; adapterName: string } | null;
	readUsed(): UsedInstance[] | null;
}

// undefined = uninitialized; null = unavailable (koffi failed to load / bind)
let native: VramNative | null | undefined;
// Total VRAM is static for the session — read once and cache. null = read failed
// (retried lazily on the next call); a successful read is cached forever.
let cachedTotal: { totalBytes: number; adapterName: string } | null | undefined;

function getNative(): VramNative | null {
	if (native === undefined) {
		native = createNative();
	}
	return native;
}

function createNative(): VramNative | null {
	if (process.platform !== 'win32') {
		return null;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let koffi: any;
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		koffi = require('koffi');
	} catch {
		return null;
	}
	if (!koffi) {
		return null;
	}

	try {
		const advapi32 = koffi.load('advapi32.dll');
		const pdh = koffi.load('pdh.dll');

		// Registry: HKEY is modelled as uintptr_t and the predefined
		// HKEY_LOCAL_MACHINE (0x80000002) is passed directly. Out-params use Node
		// Buffers (koffi passes the buffer's real address for a plain void*, so
		// the call writes into it) rather than the [n] array shorthand, which only
		// marshals back for _Out_/_Inout_-marked params.
		const RegOpenKeyExW = advapi32.func(
			'long __stdcall RegOpenKeyExW(uintptr_t hKey, str16 lpSubKey, uint32_t ulOptions, uint32_t samDesired, void *phkResult)'
		);
		const RegEnumKeyExW = advapi32.func(
			'long __stdcall RegEnumKeyExW(uintptr_t hKey, uint32_t dwIndex, void *lpName, void *lpcchName, void *lpReserved, void *lpClass, void *lpcchClass, void *lpftLastWriteTime)'
		);
		const RegGetValueW = advapi32.func(
			'long __stdcall RegGetValueW(uintptr_t hkey, str16 lpSubKey, str16 lpValue, uint32_t dwFlags, void *pdwType, void *pvData, void *pcbData)'
		);
		const RegCloseKey = advapi32.func(
			'long __stdcall RegCloseKey(uintptr_t hKey)'
		);

		const PdhOpenQueryW = pdh.func(
			'uint32_t __stdcall PdhOpenQueryW(str16 szDataSource, uintptr_t dwUserData, void *phQuery)'
		);
		const PdhAddEnglishCounterW = pdh.func(
			'uint32_t __stdcall PdhAddEnglishCounterW(uintptr_t hQuery, str16 szFullCounterPath, uintptr_t dwUserData, void *phCounter)'
		);
		const PdhCollectQueryData = pdh.func(
			'uint32_t __stdcall PdhCollectQueryData(uintptr_t hQuery)'
		);
		const PdhGetFormattedCounterArrayW = pdh.func(
			'uint32_t __stdcall PdhGetFormattedCounterArrayW(uintptr_t hCounter, uint32_t dwFormat, void *lpdwBufferSize, void *lpdwItemCount, void *ItemBuffer)'
		);
		const PdhCloseQuery = pdh.func(
			'uint32_t __stdcall PdhCloseQuery(uintptr_t hQuery)'
		);

		const readQword = (subPath: string, value: string): bigint | null => {
			const type = Buffer.alloc(4);
			const data = Buffer.alloc(8);
			const cb = Buffer.alloc(4);
			cb.writeUInt32LE(8, 0);
			const rc = RegGetValueW(
				HKEY_LOCAL_MACHINE,
				subPath,
				value,
				RRF_RT_QWORD,
				type,
				data,
				cb
			);
			return rc === ERROR_SUCCESS ? data.readBigUInt64LE(0) : null;
		};

		const readSz = (subPath: string, value: string): string => {
			const cb = Buffer.alloc(4);
			let rc = RegGetValueW(
				HKEY_LOCAL_MACHINE,
				subPath,
				value,
				RRF_RT_REG_SZ,
				null,
				null,
				cb
			);
			if (rc !== ERROR_SUCCESS && rc !== ERROR_MORE_DATA) {
				return '';
			}
			const size = cb.readUInt32LE(0);
			if (!size) {
				return '';
			}
			const data = Buffer.alloc(size);
			rc = RegGetValueW(
				HKEY_LOCAL_MACHINE,
				subPath,
				value,
				RRF_RT_REG_SZ,
				null,
				data,
				cb
			);
			if (rc !== ERROR_SUCCESS) {
				return '';
			}
			return data
				.toString('utf16le', 0, cb.readUInt32LE(0))
				.replace(/\0+$/, '');
		};

		return {
			readTotal(): { totalBytes: number; adapterName: string } | null {
				const phk = Buffer.alloc(8);
				if (
					RegOpenKeyExW(
						HKEY_LOCAL_MACHINE,
						CLASS_PATH,
						0,
						KEY_READ,
						phk
					) !== ERROR_SUCCESS
				) {
					return null;
				}
				const hClass = phk.readBigUInt64LE(0);
				let best: { totalBytes: number; adapterName: string } | null = null;
				let bestBytes = -1n;
				try {
					for (let i = 0; ; i++) {
						const nameBuf = Buffer.alloc(256 * 2);
						const cch = Buffer.alloc(4);
						// IN/OUT: reset to capacity (WCHARs, excl. null) each call.
						cch.writeUInt32LE(256, 0);
						if (
							RegEnumKeyExW(
								hClass,
								i,
								nameBuf,
								cch,
								null,
								null,
								null,
								null
							) !== ERROR_SUCCESS
						) {
							break;
						}
						const sub = nameBuf.toString(
							'utf16le',
							0,
							cch.readUInt32LE(0) * 2
						);
						// Skip non-adapter subkeys (Configuration/Properties).
						if (!/^\d{4}$/.test(sub)) {
							continue;
						}
						const subPath = `${CLASS_PATH}\\${sub}`;
						const bytes = readQword(
							subPath,
							'HardwareInformation.qwMemorySize'
						);
						// Virtual/remote/basic-render adapters have no qwMemorySize.
						if (bytes == null) {
							continue;
						}
						if (bytes > bestBytes) {
							bestBytes = bytes;
							best = {
								totalBytes: Number(bytes),
								adapterName: readSz(subPath, 'DriverDesc'),
							};
						}
					}
				} finally {
					RegCloseKey(hClass);
				}
				return best;
			},

			readUsed(): UsedInstance[] | null {
				const phQuery = Buffer.alloc(8);
				if (PdhOpenQueryW(null, 0, phQuery) !== ERROR_SUCCESS) {
					return null;
				}
				const hQuery = phQuery.readBigUInt64LE(0);
				try {
					const phCounter = Buffer.alloc(8);
					// English (language-neutral) wildcard path — works on any locale.
					if (
						PdhAddEnglishCounterW(
							hQuery,
							'\\GPU Adapter Memory(*)\\Dedicated Usage',
							0,
							phCounter
						) !== ERROR_SUCCESS
					) {
						return null;
					}
					const hCounter = phCounter.readBigUInt64LE(0);
					// Dedicated Usage is a raw gauge — one collect suffices.
					if (PdhCollectQueryData(hQuery) !== ERROR_SUCCESS) {
						return null;
					}
					// Two-call sizing: first call reports the required buffer size.
					const bufSize = Buffer.alloc(4);
					bufSize.writeUInt32LE(0, 0);
					const itemCount = Buffer.alloc(4);
					let rc = PdhGetFormattedCounterArrayW(
						hCounter,
						PDH_FMT_LARGE,
						bufSize,
						itemCount,
						null
					);
					if (rc >>> 0 !== PDH_MORE_DATA) {
						return null;
					}
					const size = bufSize.readUInt32LE(0);
					if (!size) {
						return null;
					}
					const itemBuf = Buffer.alloc(size);
					rc = PdhGetFormattedCounterArrayW(
						hCounter,
						PDH_FMT_LARGE,
						bufSize,
						itemCount,
						itemBuf
					);
					if (rc !== ERROR_SUCCESS) {
						return null;
					}
					const n = itemCount.readUInt32LE(0);
					// Collect per-adapter usage + identity so getVramInfo can
					// adapter-match against the dedicated total (cq-capture-path#1)
					// instead of blindly taking the global busiest instance.
					const instances: UsedInstance[] = [];
					for (let i = 0; i < n; i++) {
						const off = i * PDH_ITEM_SIZE;
						if (off + PDH_ITEM_SIZE > itemBuf.length) {
							break;
						}
						const cstatus = itemBuf.readUInt32LE(
							off + PDH_ITEM_CSTATUS_OFFSET
						);
						if (!isValidPdhStatus(cstatus)) {
							continue;
						}
						const bytes = Number(
							itemBuf.readBigInt64LE(off + PDH_ITEM_VALUE_OFFSET)
						);
						// Identity is only for the multi-GPU mismatch diagnostic; the
						// load-bearing value is `bytes`. The szName field is an LPWSTR
						// (a raw 64-bit pointer at item offset 0) — dereferencing it via
						// koffi from a BigInt address is unverified and could fault the
						// process, so we label by enumeration index instead. The true
						// LUID-name join needs DXGI (flagged follow-up), not PDH.
						instances.push({ instanceName: `instance-${i}`, bytes });
					}
					return instances.length > 0 ? instances : null;
				} finally {
					PdhCloseQuery(hQuery);
				}
			},
		};
	} catch (error) {
		console.error(
			'[vram-utils] koffi FFI unavailable; VRAM guardrail disabled',
			error
		);
		return null;
	}
}

// Measure current VRAM. Total is cached for the session; live usage is read
// fresh each call. Any failure yields an 'unknown'-classed VramInfo (fail-open).
export function getVramInfo(): VramInfo {
	const api = getNative();

	if (cachedTotal === undefined || cachedTotal === null) {
		// Retry the (cheap) registry read until it succeeds, then cache forever.
		try {
			cachedTotal = api ? api.readTotal() : null;
		} catch (error) {
			console.error('[vram-utils] total VRAM read failed', error);
			cachedTotal = null;
		}
	}

	let usedBytes: number | null = null;
	if (api) {
		try {
			const instances = api.readUsed();
			if (instances && instances.length > 0) {
				const totalForMatch = cachedTotal ? cachedTotal.totalBytes : 0;
				const selected = selectUsedInstance(instances, totalForMatch);
				usedBytes = selected ? selected.bytes : null;
				// Multi-GPU diagnostic: if the adapter-matched instance isn't the
				// global busiest, a foreign adapter was busier than the dGPU. This
				// residual dual-dGPU case can't be adapter-joined without DXGI, so
				// surface both identities rather than silently over- or under-warn.
				const globalBusiest = instances.reduce((a, b) =>
					b.bytes > a.bytes ? b : a
				);
				if (selected && selected !== globalBusiest) {
					log.warn('VRAM used/total adapter mismatch', {
						attributed: {
							instance: selected.instanceName,
							bytes: selected.bytes,
						},
						globalBusiest: {
							instance: globalBusiest.instanceName,
							bytes: globalBusiest.bytes,
						},
						totalBytes: totalForMatch,
						adapterName: cachedTotal ? cachedTotal.adapterName : '',
					});
				}
			}
		} catch (error) {
			console.error('[vram-utils] used VRAM read failed', error);
			usedBytes = null;
		}
	}

	if (!cachedTotal) {
		// Total unknown → predictor fails open (no warning/block).
		return {
			totalBytes: 0,
			usedBytes,
			source: 'fallback',
			adapterName: '',
		};
	}

	return {
		totalBytes: cachedTotal.totalBytes,
		usedBytes,
		source: 'native',
		adapterName: cachedTotal.adapterName,
	};
}
