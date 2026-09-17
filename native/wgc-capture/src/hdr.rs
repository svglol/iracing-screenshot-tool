//! HDR-desktop detection and scRGB-to-SDR conversion for still captures.
//!
//! Windows.Graphics.Capture must use RGBA16F when Advanced Color is active;
//! asking for RGBA8 clips the compositor's linear scRGB values before the app
//! can convert them. SDR content is scaled in that scRGB surface so that 1.0 is
//! 80 nits and the user's configured SDR white is `SDRWhiteLevel / 1000`.
//! Reversing that scale and applying the sRGB transfer function recreates the
//! original SDR pixels that iRacing presented.

use half::f16;
use windows::Win32::Devices::Display::{
    DisplayConfigGetDeviceInfo, GetDisplayConfigBufferSizes, QueryDisplayConfig,
    DISPLAYCONFIG_DEVICE_INFO_GET_ADVANCED_COLOR_INFO,
    DISPLAYCONFIG_DEVICE_INFO_GET_SDR_WHITE_LEVEL, DISPLAYCONFIG_DEVICE_INFO_GET_SOURCE_NAME,
    DISPLAYCONFIG_DEVICE_INFO_HEADER, DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO,
    DISPLAYCONFIG_MODE_INFO, DISPLAYCONFIG_PATH_INFO, DISPLAYCONFIG_SDR_WHITE_LEVEL,
    DISPLAYCONFIG_SOURCE_DEVICE_NAME, QDC_ONLY_ACTIVE_PATHS,
};
use windows::Win32::Foundation::{ERROR_INSUFFICIENT_BUFFER, ERROR_SUCCESS, HWND};
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITORINFOEXW, MONITOR_DEFAULTTONEAREST,
};

/// The Advanced Color properties that control WGC's pixel format and the
/// inverse SDR-white transform.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct HdrCaptureProfile {
    /// `true` only while Windows Advanced Color/HDR is active on this monitor.
    pub advanced_color_enabled: bool,
    /// Windows' SDR white in multiples of the scRGB reference white (80 nits).
    pub sdr_white_scale: f32,
    /// Human-readable form of the same value for diagnostics.
    pub sdr_white_nits: f64,
}

impl HdrCaptureProfile {
    fn sdr() -> Self {
        Self {
            advanced_color_enabled: false,
            sdr_white_scale: 1.0,
            sdr_white_nits: 80.0,
        }
    }
}

fn wide_z_to_string(value: &[u16]) -> String {
    let len = value.iter().position(|&c| c == 0).unwrap_or(value.len());
    String::from_utf16_lossy(&value[..len])
}

fn device_name_for_window(hwnd: HWND) -> Option<String> {
    let monitor = unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) };
    if monitor.is_invalid() {
        return None;
    }

    let mut info = MONITORINFOEXW::default();
    info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
    let ok = unsafe { GetMonitorInfoW(monitor, &mut info.monitorInfo as *mut MONITORINFO) };
    if !ok.as_bool() {
        return None;
    }

    Some(wide_z_to_string(&info.szDevice))
}

fn active_display_paths() -> Option<Vec<DISPLAYCONFIG_PATH_INFO>> {
    // The active topology can change between sizing and querying. Retry the
    // documented ERROR_INSUFFICIENT_BUFFER race a few times rather than making
    // HDR capture brittle during a monitor hot-plug or mode switch.
    for _ in 0..3 {
        let mut path_count = 0u32;
        let mut mode_count = 0u32;
        let size_result = unsafe {
            GetDisplayConfigBufferSizes(QDC_ONLY_ACTIVE_PATHS, &mut path_count, &mut mode_count)
        };
        if size_result != ERROR_SUCCESS {
            return None;
        }

        let mut paths = vec![DISPLAYCONFIG_PATH_INFO::default(); path_count as usize];
        let mut modes = vec![DISPLAYCONFIG_MODE_INFO::default(); mode_count as usize];
        let query_result = unsafe {
            QueryDisplayConfig(
                QDC_ONLY_ACTIVE_PATHS,
                &mut path_count,
                paths.as_mut_ptr(),
                &mut mode_count,
                modes.as_mut_ptr(),
                None,
            )
        };
        if query_result == ERROR_INSUFFICIENT_BUFFER {
            continue;
        }
        if query_result != ERROR_SUCCESS {
            return None;
        }

        paths.truncate(path_count as usize);
        return Some(paths);
    }

    None
}

/// Resolve the Advanced Color state for the monitor containing `hwnd`.
///
/// Failure intentionally returns an SDR profile. The existing RGBA8 path then
/// remains available instead of risking a mis-scaled image from a guessed white
/// level.
pub(crate) fn profile_for_window(hwnd: HWND) -> HdrCaptureProfile {
    let Some(window_device) = device_name_for_window(hwnd) else {
        return HdrCaptureProfile::sdr();
    };
    let Some(paths) = active_display_paths() else {
        return HdrCaptureProfile::sdr();
    };

    for path in paths {
        let mut source_name = DISPLAYCONFIG_SOURCE_DEVICE_NAME::default();
        source_name.header = DISPLAYCONFIG_DEVICE_INFO_HEADER {
            r#type: DISPLAYCONFIG_DEVICE_INFO_GET_SOURCE_NAME,
            size: std::mem::size_of::<DISPLAYCONFIG_SOURCE_DEVICE_NAME>() as u32,
            adapterId: path.sourceInfo.adapterId,
            id: path.sourceInfo.id,
        };
        let source_result = unsafe {
            DisplayConfigGetDeviceInfo(
                &mut source_name.header as *mut DISPLAYCONFIG_DEVICE_INFO_HEADER,
            )
        };
        if source_result != 0
            || !wide_z_to_string(&source_name.viewGdiDeviceName)
                .eq_ignore_ascii_case(&window_device)
        {
            continue;
        }

        let target_header = DISPLAYCONFIG_DEVICE_INFO_HEADER {
            adapterId: path.targetInfo.adapterId,
            id: path.targetInfo.id,
            ..Default::default()
        };

        let mut advanced = DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO::default();
        advanced.header = DISPLAYCONFIG_DEVICE_INFO_HEADER {
            r#type: DISPLAYCONFIG_DEVICE_INFO_GET_ADVANCED_COLOR_INFO,
            size: std::mem::size_of::<DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO>() as u32,
            ..target_header
        };
        let advanced_result = unsafe {
            DisplayConfigGetDeviceInfo(
                &mut advanced.header as *mut DISPLAYCONFIG_DEVICE_INFO_HEADER,
            )
        };
        if advanced_result != 0 {
            return HdrCaptureProfile::sdr();
        }

        // Bit 1 is advancedColorEnabled. Reading the union's aggregate value is
        // more stable than depending on generated bitfield accessor names.
        let advanced_color_enabled = unsafe { advanced.Anonymous.value & 0b10 != 0 };
        if !advanced_color_enabled {
            return HdrCaptureProfile::sdr();
        }

        let mut white = DISPLAYCONFIG_SDR_WHITE_LEVEL::default();
        white.header = DISPLAYCONFIG_DEVICE_INFO_HEADER {
            r#type: DISPLAYCONFIG_DEVICE_INFO_GET_SDR_WHITE_LEVEL,
            size: std::mem::size_of::<DISPLAYCONFIG_SDR_WHITE_LEVEL>() as u32,
            ..target_header
        };
        let white_result = unsafe {
            DisplayConfigGetDeviceInfo(&mut white.header as *mut DISPLAYCONFIG_DEVICE_INFO_HEADER)
        };
        if white_result != 0 || white.SDRWhiteLevel == 0 {
            return HdrCaptureProfile::sdr();
        }

        let scale = (white.SDRWhiteLevel as f32 / 1000.0).clamp(0.5, 20.0);
        return HdrCaptureProfile {
            advanced_color_enabled: true,
            sdr_white_scale: scale,
            sdr_white_nits: f64::from(scale) * 80.0,
        };
    }

    HdrCaptureProfile::sdr()
}

#[inline]
fn linear_to_srgb(value: f32) -> f32 {
    let value = if value.is_finite() {
        value.max(0.0)
    } else {
        0.0
    };
    if value <= 0.003_130_8 {
        value * 12.92
    } else {
        1.055 * value.powf(1.0 / 2.4) - 0.055
    }
}

fn rgb_lut(sdr_white_scale: f32) -> Vec<u8> {
    (0u32..=u16::MAX as u32)
        .map(|bits| {
            let linear = f16::from_bits(bits as u16).to_f32() / sdr_white_scale;
            (linear_to_srgb(linear).clamp(0.0, 1.0) * 255.0 + 0.5) as u8
        })
        .collect()
}

fn alpha_lut() -> Vec<u8> {
    (0u32..=u16::MAX as u32)
        .map(|bits| {
            let alpha = f16::from_bits(bits as u16).to_f32();
            let alpha = if alpha.is_finite() { alpha } else { 0.0 };
            (alpha.clamp(0.0, 1.0) * 255.0 + 0.5) as u8
        })
        .collect()
}

/// Convert tightly packed RGBA16F scRGB into the RGBA8 sRGB layout consumed by
/// the existing Sharp pipeline.
pub(crate) fn scrgb_to_srgba8(input: &[u8], sdr_white_scale: f32) -> Result<Vec<u8>, String> {
    if input.len() % 8 != 0 {
        return Err(format!(
            "RGBA16F buffer length {} is not a multiple of 8",
            input.len()
        ));
    }
    if !sdr_white_scale.is_finite() || sdr_white_scale <= 0.0 {
        return Err(format!("invalid SDR white multiplier {sdr_white_scale}"));
    }

    // Half floats have only 65,536 possible bit patterns. A per-capture LUT
    // avoids four expensive float conversions/powf calls per pixel at 8K; the
    // hot loop becomes a sequential read plus four tiny cached lookups.
    let rgb = rgb_lut(sdr_white_scale);
    let alpha = alpha_lut();
    let mut output = Vec::with_capacity(input.len() / 2);

    for pixel in input.chunks_exact(8) {
        let r = u16::from_le_bytes([pixel[0], pixel[1]]) as usize;
        let g = u16::from_le_bytes([pixel[2], pixel[3]]) as usize;
        let b = u16::from_le_bytes([pixel[4], pixel[5]]) as usize;
        let a = u16::from_le_bytes([pixel[6], pixel[7]]) as usize;
        output.extend_from_slice(&[rgb[r], rgb[g], rgb[b], alpha[a]]);
    }

    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rgba16f(values: [f32; 4]) -> Vec<u8> {
        values
            .into_iter()
            .flat_map(|value| f16::from_f32(value).to_bits().to_le_bytes())
            .collect()
    }

    #[test]
    fn reverses_windows_sdr_white_scaling() {
        // On a 240-nit desktop, Windows maps SDR white to scRGB 3.0 because
        // scRGB 1.0 is defined as 80 nits.
        let output = scrgb_to_srgba8(&rgba16f([3.0, 1.5, 0.0, 1.0]), 3.0).unwrap();
        assert_eq!(output[0], 255);
        assert!((output[1] as i16 - 188).abs() <= 1); // linear 0.5 -> sRGB ~0.735
        assert_eq!(output[2], 0);
        assert_eq!(output[3], 255);
    }

    #[test]
    fn clamps_extended_and_negative_scrgb_values() {
        let output = scrgb_to_srgba8(&rgba16f([12.5, -0.5, f32::NAN, 2.0]), 3.0).unwrap();
        assert_eq!(output, [255, 0, 0, 255]);
    }

    #[test]
    fn rejects_malformed_input() {
        assert!(scrgb_to_srgba8(&[0; 7], 3.0).is_err());
        assert!(scrgb_to_srgba8(&[0; 8], 0.0).is_err());
    }
}
