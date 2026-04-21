'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const electronBuilderCliPath = path.join(
	projectRoot,
	'node_modules',
	'electron-builder',
	'cli.js'
);

function fail(message) {
	console.error(message);
	process.exit(1);
}

function readPackageVersion() {
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
	const version = String(packageJson.version || '').trim();

	if (!version) {
		fail('Could not determine the package version from package.json');
	}

	return version;
}

function getShortCommitHash() {
	const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
		cwd: projectRoot,
		encoding: 'utf8',
		windowsHide: true,
	});

	if (result.status !== 0) {
		const detail = String(result.stderr || result.stdout || '').trim();
		fail(
			`Could not determine the current git commit${detail ? `: ${detail}` : ''}`
		);
	}

	const shortHash = String(result.stdout || '').trim();
	if (!shortHash) {
		fail('Git returned an empty short commit hash');
	}

	return shortHash;
}

function toPosixPath(targetPath) {
	return targetPath.replace(/\\/g, '/');
}

function runElectronBuilder(args) {
	const result = spawnSync(
		process.execPath,
		[electronBuilderCliPath].concat(args),
		{
			cwd: projectRoot,
			stdio: 'inherit',
			windowsHide: true,
		}
	);

	if (typeof result.status === 'number') {
		process.exit(result.status);
	}

	process.exit(1);
}

const baseVersion = readPackageVersion();
const shortCommitHash = getShortCommitHash();
const devVersion = `${baseVersion}+${shortCommitHash}`;
const outputDir = toPosixPath(path.join('build', 'dev', devVersion));
const userArgs = process.argv.slice(2);
const buildArgs = userArgs.length > 0 ? userArgs : ['--dir'];

console.log(`Building dev package ${devVersion}`);
console.log(`Output directory: ${outputDir}`);

runElectronBuilder(
	buildArgs.concat([
		`-c.directories.output=${outputDir}`,
		`-c.buildVersion=${baseVersion}`,
		`-c.extraMetadata.version=${devVersion}`,
	])
);
