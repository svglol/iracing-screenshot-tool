'use strict';

const { CameraState } = require('irsdk-node');

function normalizeTelemetryValue(value) {
	if (!Array.isArray(value)) {
		return value;
	}

	if (value.length === 1) {
		return value[0];
	}

	return [...value];
}

function decodeCameraState(mask) {
	if (typeof mask !== 'number') {
		return [];
	}

	return Object.entries(CameraState)
		.filter(([name, value]) => {
			return (
				Number.isInteger(value) && value !== 0 && (mask & value) === value
			);
		})
		.map(([name]) => name);
}

function flattenTelemetry(rawTelemetry) {
	const values = {};

	Object.entries(rawTelemetry || {}).forEach(([name, variable]) => {
		values[name] = normalizeTelemetryValue(variable.value);
	});

	values.CamCameraState = decodeCameraState(values.CamCameraState);

	return { values };
}

module.exports = {
	normalizeTelemetryValue,
	decodeCameraState,
	flattenTelemetry,
};
