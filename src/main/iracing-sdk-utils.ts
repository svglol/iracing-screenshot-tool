import { CameraState } from 'irsdk-node';

export function normalizeTelemetryValue(value: unknown): unknown {
	if (!Array.isArray(value)) {
		return value;
	}

	if (value.length === 1) {
		return value[0];
	}

	return [...value];
}

export function decodeCameraState(mask: unknown): string[] {
	if (typeof mask !== 'number') {
		return [];
	}

	return Object.entries(CameraState as unknown as Record<string, number>)
		.filter(([, value]) => {
			return (
				Number.isInteger(value) && value !== 0 && (mask & value) === value
			);
		})
		.map(([name]) => name);
}

interface RawTelemetryEntry {
	value: unknown;
}

export function flattenTelemetry(
	rawTelemetry: Record<string, RawTelemetryEntry> | null | undefined
): { values: Record<string, unknown> } {
	const values: Record<string, unknown> = {};

	Object.entries(rawTelemetry || {}).forEach(([name, variable]) => {
		values[name] = normalizeTelemetryValue(
			(variable as RawTelemetryEntry).value
		);
	});

	values.CamCameraState = decodeCameraState(values.CamCameraState);

	return { values };
}
