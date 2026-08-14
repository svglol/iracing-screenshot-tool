// Korean. Translated from en.ts — see that file's header before editing.
//
// NOTE ON PLURALS. Korean has no grammatical plural — Intl.PluralRules('ko')
// answers `other` for every count — so each plural node supplies `other` alone.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.
// iRacing's own menu labels are quoted in English because that is what the user
// has to find on screen.

import type { Catalog } from './index';

const ko: Catalog = {
	notice: {
		danger: '문제',
		warning: '주의 사항',
		info: '참고 사항',
	},

	promo: {
		greeting: 'iRacing Screenshot Tool을 사용해 주셔서 감사합니다!',
		signature: 'AR Media Solutions에서 제작하고 관리합니다.',
	},

	changelog: {
		title: '변경 내역',
		untitledRelease: '릴리스',
	},

	gallery: {
		menu: {
			openExternally: '외부 앱으로 열기',
			openFolder: '폴더 열기',
			copy: '복사',
			delete: '삭제',
		},
		copiedToClipboard: '{name}을(를) 클립보드에 복사했습니다',
	},

	sidebar: {
		resolution: '해상도',
		width: '너비',
		height: '높이',
		output: '출력:',
		cropWatermark: '워터마크 잘라내기',
		keepAspectRatio: '화면 비율 유지',
		screenshot: '스크린샷',
		custom: '사용자 지정',
		vramStatus: '{adapter}{total} 중 {free} 사용 가능',
		savedSuccessfully: '{name}을(를) 저장했습니다',
		screenshotFailed: '스크린샷 실패: {message}',
		errorLogPrefix: '로그: ',
		notices: {
			exclusiveFullscreen:
				'iRacing이 전용 전체 화면 모드로 실행 중입니다 — 스크린샷이 검게 나옵니다. iRacing에서 Display > Full Screen을 OFF(Borderless 또는 Windowed)로 설정하면 캡처할 수 있습니다.',
			vramRisk:
				'{resolution}에는 VRAM이 약 {needed} 더 필요하지만 {free}만 남아 있습니다 — iRacing의 메모리가 부족해져 충돌할 가능성이 높습니다.',
			vramCaution:
				'{resolution}은(는) VRAM 여유가 거의 없어({free} 사용 가능) 무거운 트랙/차량 조합에서 충돌할 수 있습니다.',
			switchResolution: '{resolution}(으)로 전환',
			vramStatic:
				'높은 해상도에서는 VRAM이 부족하면 iRacing이 충돌할 수 있습니다. 특정 트랙/차량 조합은 VRAM을 더 많이 사용합니다.',
			reshade:
				'iRacing Screenshot Tool에서 스크린샷 버튼을 누른 뒤, ReShade의 스크린샷 단축키를 따로 눌러야 합니다.',
			crop: '워터마크 잘라내기는 최종 사진을 약간 확대합니다. 화면 가장자리에 가까운 영역은 잘려 나갑니다.',
			aspectRatio:
				'화면 비율 유지는 스크린샷 높이를 기본값인 16:9 대신 모니터의 화면 비율(예: 21:9 울트라와이드)에 맞춥니다. 너비는 선택한 해상도가 결정합니다.',
		},
	},

	settings: {
		title: '설정',
		version: '버전 - {version}',
		changelog: '변경 내역',
		openLogsFolder: '로그 폴더 열기',
		checkForUpdates: '업데이트 확인',
		updateCheckFailed: '업데이트 확인 실패: {message}',

		language: '언어',
		languageDescription:
			'앱 전체에서 사용하는 언어입니다. 앱을 처음 실행할 때 Windows에서 감지합니다.',

		screenshotFolder: '스크린샷 폴더',
		selectFolder: '폴더 선택',
		screenshotKeybind: '스크린샷 단축키',
		editBind: '단축키 변경',

		customFilenameFormat: '사용자 지정 파일 이름 형식',
		customFilenameFormatDescription:
			'기본값({track}-{driver}-{counter}) 대신 사용자 지정 패턴을 사용합니다',
		filenameFieldsHint:
			'항목을 클릭하면 형식에 추가됩니다. 구분자(-, _ 등)는 직접 입력하세요.',
		reset: '초기화',
		preview: '미리 보기:',

		outputFormat: '출력 형식',
		formatJpeg: 'JPEG (최고 품질)',
		formatPng: 'PNG (무손실)',
		formatWebp: 'WebP (품질 95%)',

		disableTooltips: '툴팁 끄기',
		disableTooltipsDescription: '내버려 두세요, 뭘 하는지 알고 있습니다',

		cropTopLeft: '왼쪽 위 기준 워터마크 잘라내기 우선',
		cropTopLeftDescription:
			'오른쪽 아래 모서리만(3%) 잘라냅니다. 끄면 스크린샷을 모든 방향에서 균등하게(총 6%) 잘라내 가운데가 유지됩니다.',

		manualWindowRestore: '수동 창 복원',
		manualWindowRestoreDescription:
			'자동 창 복원 대신 직접 지정한 위치와 크기를 사용합니다. 울트라와이드나 Nvidia Surround를 쓰는 경우에 유용합니다',
		left: '왼쪽',
		top: '위',
		width: '너비',
		height: '높이',
		restoreNow: '지금 복원',

		nativeCapture: '고품질 캡처 (WGC)',
		nativeCaptureDescription:
			'색상을 서브샘플링하는 기본 파이프라인 대신 Windows.Graphics.Capture로 서브샘플링되지 않은 실제 색상을 캡처합니다. 캡처에 실패하면 자동으로 기본 방식으로 되돌아갑니다.',
		nativeCaptureUnavailable:
			'이 시스템에서는 사용할 수 없습니다 — 고품질 캡처를 실행할 수 없습니다.',
		nativeCaptureUnverified:
			'Windows는 지원한다고 보고하지만 테스트 캡처가 돌아오지 않았습니다. 계속 실패하면 캡처는 자동으로 기본 방식으로 되돌아갑니다.',

		reshade: 'ReShade 호환 모드',
		reshadeDescription:
			'ReShade를 사용할 때는 먼저 iRacing Screenshot Tool의 단축키를 쓰거나 버튼을 누르고, iRacing 창의 크기가 바뀐 다음에 ReShade의 스크린샷 단축키를 사용해야 합니다',
		reshadeIni: 'ReShade INI 파일',
		selectFile: '파일 선택',
	},

	longExposure: {
		title: '장노출',
		shutter: '셔터',
		playbackSpeed: '재생 속도',
		playbackAuto: '자동 (목표 샘플 수 기준)',
		playbackRealTime: '1x (실시간)',
		targetSamples: '목표 샘플 수',
		advanced: '고급',
		defaultsSummary: '기본값 {count}개',

		weighting: '가중치',
		weightingBox: 'Box (균등)',
		weightingLinear: 'Linear (끝부분이 선명)',
		weightingEase: 'Ease (앞부분이 더 선명, 긴 꼬리)',

		interpolation: '프레임 보간',
		interpolationOff: '끔',
		interpolation2: '2× (중간 프레임 1장)',
		interpolation4: '4× (중간 프레임 3장)',
		interpolation8: '8× (중간 프레임 7장)',

		passes: '패스',
		passes1: '1 (단일 패스)',
		passes2: '2× — 대기 시간 2배',
		passes4: '4× — 대기 시간 4배',
		passes8: '8× — 대기 시간 8배',

		bracket: '셔터 브라케팅',
		highlightRecovery: '하이라이트 복구 (스톱)',

		cancel: '취소',
		saved: '장노출을 저장했습니다 — 샘플 {count}개',
		failed: '장노출에 실패했습니다',

		// Fragments for the folded Advanced row, joined by commas — not sentences.
		modified: {
			weighting_linear: 'linear',
			weighting_ease: 'ease',
			interpolation: '{factor}× 보간',
			passes: {
				other: '{count} 패스',
			},
			bracketed: '브라케팅',
			recovery: '{stops} 스톱 복구',
		},

		progress: {
			working: '작업 중…',
			seeking: '탐색 중…{pass}',
			accumulating: '노출 중… 샘플 {count}개{pass}',
			resolving: '현상 중…',
			restoring: '리플레이 복원 중…',
			pass: ' (패스 {current}/{total})',
		},

		notices: {
			needsNativeCapture:
				'장노출에는 고품질 캡처(WGC)가 필요하지만 지금은 꺼져 있습니다. 설정에서 켜면 장노출을 사용할 수 있습니다.',
			unavailableWithReason:
				'이 컴퓨터에서는 장노출을 사용할 수 없습니다: {reason}',
			unavailable: '이 컴퓨터에서는 장노출을 사용할 수 없습니다.',
			interpolationCost:
				'보간은 실제 프레임 사이에 프레임을 지어내어 궤적을 매끄럽게 만듭니다. 프레임마다 GPU 시간을 쓰므로, 저장된 사진의 실제 샘플 수를 보간을 끄고 찍은 같은 사진과 비교해 보세요. 그 수가 줄어든다면 실제 샘플을 대가로 지어낸 샘플을 사는 셈입니다.',
			passesAndInterpolation:
				'패스와 보간은 같은 프레임당 예산을 두고 경쟁합니다. 둘 다 켜면 각 패스가 실제 프레임을 더 적게 캡처하므로, 같은 시간을 기다린다면 보간을 끄는 편이 대체로 더 나은 사진을 만듭니다.',
			passes:
				'각 패스는 같은 순간을 다시 재생하며 다른 패스가 놓친 프레임을 잡아내므로, 궤적이 밝아지는 것이 아니라 매끄러워집니다. 단일 패스로는 샘플이 몇 개밖에 모이지 않는 빠른 셔터에서 가장 효과적입니다.',
			interpolationUnsupported:
				'프레임 보간에는 NVIDIA Turing 이상의 GPU가 필요합니다{adapter}. 장노출의 나머지 기능은 평소대로 작동합니다.',
			interpolationAdapter: ' (이 캡처는 {adapter}에서 실행됩니다)',
			reshade:
				'장노출은 네이티브로 캡처하며 ReShade를 사용하지 않으므로, ReShade 효과는 결과물에 나타나지 않습니다.',
		},
	},

	help: {
		title: '도움말',
		sections: '도움말 항목',
		tabGeneral: '일반',
		tabLongExposure: '장노출',
		tabFaq: 'FAQ',

		general: {
			iracingSettings: 'iRacing 설정',
			borderless: 'iRacing은 Windowed Borderless 모드로 실행해야 합니다',
			vram: '8K 이상 해상도의 스크린샷에는 VRAM 8GB 이상을 권장합니다',
			newerContent: '최신 트랙과 차량은 VRAM을 더 많이 사용합니다',
			shrinkUi:
				'워터마크 잘라내기 옵션을 사용한다면 스크린샷을 찍기 전에 UI를 가능한 한 작게 줄이세요. "Control+PageDown"으로 줄일 수 있으며, 이것이 듣지 않으면 iRacing 설정에서 UI 확대 배율을 초기화해야 할 수 있습니다',

			screenshotFolder: '스크린샷 폴더',
			screenshotFolderBody:
				'스크린샷은 기본적으로 "C:\\Users\\user\\Pictures\\Screenshots"에 저장되며, 설정에서 바꿀 수 있습니다',

			screenshotHotkey: '스크린샷 단축키',
			screenshotHotkeyBody:
				'기본적으로 "Control + PrintScreen"을 누르면 현재 설정으로 스크린샷을 찍습니다. 설정에서 바꿀 수 있습니다.',

			issues: '문제',
			issuesBody: '문제가 있으면 다음에서 알려 주세요:',
			discord: 'Discord',

			instructions: '사용 방법',
			step1: 'iRacing은 <b>반드시</b> Windowed Borderless 모드로 실행해야 합니다',
			step2: 'iRacing을 실행하고 스크린샷을 찍고 싶은 위치에 카메라를 맞추세요',
			step3: '원하는 해상도를 선택하세요 (8K로 올리기 전에 낮은 해상도를 먼저 시도해 보세요)',
			step4: 'iRacing 워터마크를 잘라낼지 선택하세요. 잘라내려면 먼저 "Control + PageDown"으로 iRacing UI를 가장 작은 크기로 줄여야 합니다',
			step5: '스크린샷 버튼을 누르거나 단축키 "Control + PrintScreen"을 사용해 스크린샷을 찍으세요',
			step6: '선택한 해상도에 따라 몇 초가 걸릴 수 있습니다. iRacing 화면이 원래 크기로 돌아오면 끝난 것입니다',
			step7: '스크린샷은 "C:\\Users\\{User}\\Pictures\\Screenshots"에 저장됩니다',
		},

		longExposure: {
			whatItDoes: '어떤 기능인가요',
			whatItDoesBody:
				'장노출은 카메라 셔터를 열어 두는 것처럼 리플레이의 여러 프레임을 한 장의 이미지로 합칩니다. 멈춰 있는 것은 선명하게 남고, 움직이는 것은 궤적을 그립니다. 이 도구가 리플레이를 직접 제어해 시뮬레이터가 표시하는 모든 프레임을 캡처하고 GPU에서 더합니다.',

			shutter: '셔터',
			shutterBody:
				'<i>리플레이 시간</i> 기준으로 노출이 얼마나 지속되는지를 정합니다. 리플레이 한 프레임의 일부부터 10초까지 지정할 수 있습니다. 궤적의 길이를 결정하는 설정입니다. 셔터가 길수록 프레임도 많이 모이므로 아래의 설정에 덜 기대게 됩니다. 가장 빠른 단계는 리플레이 한 프레임에 걸쳐 있어 샘플이 몇 개밖에 모이지 않습니다.',

			playback: '재생 속도',
			playbackBody:
				'노출을 캡처하는 동안 리플레이는 슬로 모션으로 재생됩니다. 그래서 시뮬레이터가 리플레이 시간 1초당 더 많은 프레임을 표시하고, 합성에 더 많은 샘플이 들어갑니다. 1/16은 실시간보다 약 16배 많은 프레임을 모으며, 실제로 기다리는 시간도 16배 늘어납니다. 이 패널의 핵심 교환입니다. 기다림과 매끄러움을 맞바꾸는 것입니다.',
			playbackAutoBody:
				'"자동 (목표 샘플 수 기준)"은 <b>목표 샘플 수</b>를 바탕으로 속도를 대신 골라 줍니다. 요청한 샘플 수에 도달하는 가장 빠른 재생 속도를 계산합니다. 기다리는 시간을 제한하고 싶다면 속도를 직접 지정하세요.',

			weighting: '가중치',
			weightingBody:
				'캡처한 각 프레임이 결과에 얼마나 기여하는지 정합니다. <b>Box</b>는 모두 같은 비중으로 다루어 균일한 궤적을 만듭니다. <b>Linear</b>는 노출 구간의 끝으로 갈수록 비중이 커지므로, 피사체는 마지막 위치에서 가장 선명하고 지나온 경로를 따라 흐려집니다. <b>Ease</b>는 같은 개념에 더 선명한 머리와 더 긴 꼬리를 더한 것입니다.',

			interpolation: '프레임 보간',
			interpolationBody:
				'GPU의 옵티컬 플로 엔진으로 실제 프레임 사이에 프레임을 지어내어 궤적의 빈틈을 채웁니다. NVIDIA Turing 이상의 카드가 필요하며, 지원하지 않는 하드웨어에서는 아예 표시되지 않습니다.',
			interpolationCostBody:
				'공짜는 아닙니다. 캡처하는 프레임마다 GPU 시간을 쓰는데, 주어진 예산은 iRacing 프레임 하나입니다. 따라가지 못하면 합성 프레임을 만들려고 <i>실제</i> 프레임을 놓치기 시작하며, 이는 결국 손해입니다. 궤적이 더 짧고 거칠어집니다. 비용은 메가픽셀 수에 배수를 곱한 만큼 늘어나므로, 2560×1440에서 여유로운 설정도 8K에서는 무리입니다. 확인하려면 같은 순간을 보간을 켜고 한 번, 끄고 한 번 찍어 실제 샘플 수를 비교해 보세요. 사진이 목표에 못 미치면 앱이 촬영 후에 알려 주기도 합니다.',

			passes: '패스',
			passesBody:
				'같은 순간을 여러 번 훑으며 하나의 이미지에 누적합니다. 각 패스는 다른 패스가 놓친 프레임을 잡아내므로 궤적이 매끄러워집니다. 밝아지지는 않습니다. 결과가 각 픽셀에 실제로 도달한 빛의 양으로 정규화되기 때문입니다.',
			passesTradeBody:
				'패스는 보간과 같은 것을 사지만 치르는 대가가 다릅니다. GPU 시간이 아니라 실제 시간입니다. 패스 8회는 대략 8배의 시간이 걸리지만 실제 프레임을 잃게 만드는 일은 결코 없습니다. 그래서 보간이 따라가지 못하는 높은 해상도와, 단일 패스로는 샘플이 거의 모이지 않는 빠른 셔터에서는 패스가 올바른 선택입니다. 둘을 함께 쓰는 것은 대체로 가장 나쁜 선택입니다. 같은 프레임당 예산을 두고 경쟁하기 때문입니다.',

			bracket: '셔터 브라케팅',
			bracketBody:
				'한 번의 캡처로, 선택한 셔터와 같거나 더 빠른 스톱마다 이미지를 하나씩 만들어 냅니다. 1/60으로 찍으면 1/125, 1/250, 1/500, 1/1000도 함께 얻습니다. 같은 순간을 점점 짧아지는 궤적으로 담아 주므로, 짐작해서 다시 찍는 대신 나중에 마음에 드는 것을 고를 수 있습니다.',
			bracketCostBody:
				'추가 시간은 거의 들지 않습니다. 모든 스톱이 같은 프레임에서 끝나고 얼마나 뒤까지 거슬러 가는지만 다르므로, 더 빠른 셔터는 이미 지나가고 있는 프레임의 꼬리일 뿐입니다. 모두 리플레이 한 번의 패스로 채워집니다.',
			bracketMemoryBody:
				'대신 메모리를 씁니다. 스톱마다 전체 해상도의 누적 버퍼가 따로 필요하므로 11스톱은 1스톱의 11배에 달하는 비디오 메모리를 쓰며, 8K에서는 대부분의 카드가 감당하지 못합니다. 캡처는 시작하기 전에 이를 확인하고, iRacing을 충돌시키는 대신 거부합니다. 브라케팅이 거부되면 해상도를 낮추거나 더 빠른 셔터를 고르세요. 더 빠른 셔터는 사다리도 짧아집니다.',
			bracketNamingBody:
				'선택한 스톱은 평소와 같은 이름으로 저장되며 갤러리에 나타나는 것도 이 사진입니다. 나머지는 파일 이름에 셔터 값이 붙은 채로 그 옆에 놓입니다.',

			highlights: '하이라이트 복구',
			highlightsBody:
				'프레임을 더하기 전에 클리핑에 가까운 하이라이트를 끌어올리고, 마지막에 그 보정을 되돌립니다. iRacing은 이미 톤 매핑을 마친 이미지를 넘겨주므로 헤드라이트와 흰 벽이 같은 값으로 도착합니다. 이를 그대로 평균 내면, 노출 구간의 일부를 지나가는 밝은 빛이 밝은 궤적이 아니라 회색 얼룩처럼 보입니다. 이 옵션은 실제 센서가 가진 비선형성을 제자리에 되돌려 놓습니다. 단위는 스톱이며, 0은 꺼짐이라 아무것도 바꾸지 않습니다.',

			whatItSaves: '무엇이 저장되나요',
			whatItSavesBody:
				'크기, 워터마크 잘라내기, 파일 형식은 모두 일반 스크린샷과 같은 설정을 따릅니다. 위쪽의 해상도와 워터마크 잘라내기 설정, 그리고 설정 화면의 출력 형식입니다. 사이드바 맨 위의 출력 줄이 실제로 무엇을 얻게 되는지 정확히 보여 줍니다.',
			whatItSavesPngBody:
				'PNG를 고르면 진짜 16비트 마스터가 저장되므로, 나중에 색을 보정할 생각이라면 그만한 값을 합니다. 갤러리용 8비트 미리보기도 함께 저장됩니다. 다만 높은 해상도에서는 저장이 훨씬 느립니다. 3300만 화소 16비트 PNG는 약 10초가 걸리지만, 같은 프레임을 JPEG으로 저장하면 1초도 걸리지 않습니다.',

			troubleshooting: '결과가 이상해 보인다면',
			troubleGhosts:
				'<b>매끄러운 궤적 대신 뚝뚝 끊긴 잔상</b> — 샘플이 너무 적습니다. 재생 속도를 낮추거나, 패스를 늘리거나, 해상도를 낮추세요.',
			troubleShutter:
				'<b>어떤 셔터를 원했는지 모르겠다면</b> — 셔터 브라케팅을 켜고, 같은 시간을 기다린 뒤 나중에 고르세요.',
			troubleHighlights:
				'<b>하이라이트가 날아갔거나 밋밋하다면</b> — 하이라이트 복구를 3~5스톱으로 시도해 보세요.',
			troubleBlack:
				'<b>검은 이미지</b> — iRacing이 전용 전체 화면 모드입니다. Display &gt; Full Screen을 OFF로 설정하세요.',
			troubleSidecar:
				'모든 사진은 사용한 설정, 샘플 수, 샘플이 얼마나 고르게 들어왔는지를 로그 폴더의 app.log 옆에 .json 파일로 기록합니다. 최근 20장이 보관되며 — 브라케팅은 한 장으로 셉니다 — 지금 살펴보려는 사진은 살펴보는 동안에도 그대로 남아 있습니다.',
		},

		faq: {
			blackShot: '사진은 검은데 iRacing UI는 보입니다',
			blackShotBody:
				'캡처 자체는 성공했습니다. 오버레이가 그려졌다는 것은 실제 프레임이 도구까지 도달했다는 뜻입니다. 빠진 것은 3D 장면이며, iRacing이 그것을 검게 렌더링했기 때문입니다. 흔치 않은 카메라 몇 가지가 이렇게 동작하는데, 서스펜션 카메라가 가장 자주 문제가 됩니다. 일반적인 카메라(콕핏, 체이스, TV 카메라 등)로 옮겨 같은 순간을 다시 찍어 보세요.',
			blackShotFullscreenBody:
				'UI를 <i>포함해</i> 이미지 전체가 검고 어떤 카메라에서도 똑같다면 원인은 다릅니다. iRacing이 전용 전체 화면 모드이며, 이 모드는 시뮬레이터 바깥의 어떤 프로그램도 캡처할 수 없습니다. Display &gt; Full Screen을 OFF로 설정하세요.',

			cameraReset: '스크린샷을 찍기 직전에 iRacing이 카메라를 옮깁니다',
			cameraResetBody:
				'이 도구가 아니라 iRacing 자체의 자동 샷 선택 기능 때문입니다. 켜져 있는 동안 iRacing은 스스로 카메라를 계속 고르며, 캡처가 시작되는 순간 기본 구도로 되돌아갑니다. 그래서 준비해 둔 장면이 아닌 다른 장면이 찍힙니다.',
			cameraResetFixBody:
				'iRacing의 카메라 도구(Ctrl+F12)에서 <b>Camera &gt; Config &gt; Preferences</b>에 있는 <b>Shot Selection</b>의 <b>Automatic</b> 토글을 끄세요. 끄고 나면 일반 스크린샷이든 장노출이든 카메라가 설정해 둔 자리에 그대로 머무릅니다.',
		},
	},

	update: {
		checking: '업데이트 확인 중…',
		newVersion: '새 버전',
		availableBusy:
			'{version}을(를) 사용할 수 있습니다. 캡처가 진행 중이므로 끝난 뒤에 내려받을 수 있습니다.',
		available: '{version}을(를) 사용할 수 있습니다. 클릭하면 내려받습니다.',
		downloading: '{version} 내려받는 중…',
		downloadingPercent: '{version} 내려받는 중 — {percent}%',
		downloadedBusy:
			'{version} 준비가 끝났습니다. 캡처가 진행 중이므로 앱을 닫을 때 설치됩니다.',
		downloaded:
			'{version} 준비가 끝났습니다. 클릭하면 다시 시작하고 설치합니다.',
		failed: '업데이트 확인 실패: {error}',
		unknownError: '알 수 없는 오류',
		neverChecked: '아직 업데이트를 확인하지 않았습니다 (현재 v{version}).',
		upToDate: '최신 버전을 사용 중입니다 (v{version}).',

		alreadyDownloading: '업데이트를 이미 내려받고 있습니다.',
		alreadyDownloaded: '업데이트를 이미 내려받았습니다.',
		nothingToDownload: '내려받을 업데이트가 없습니다.',
		captureInProgress: '캡처가 진행 중입니다. 끝난 뒤에 다시 시도하세요.',
		nothingToInstall: '설치할 업데이트가 없습니다.',
		captureInProgressInstall:
			'캡처가 진행 중입니다. 업데이트는 앱을 닫을 때 자동으로 설치됩니다.',
		devBuildOnly: '업데이트 확인은 설치된 빌드에서만 동작합니다.',

		installTitle: '업데이트 설치',
		installMessage: '{version} 버전을 설치할까요?',
		installFallbackVersion: '업데이트',
		installDetail:
			'업데이트를 설치하면 앱이 닫혔다가 다시 열립니다. "나중에"를 선택하면 다음에 앱을 닫을 때 자동으로 설치됩니다.',
		installConfirm: '다시 시작하고 설치',
		installLater: '나중에',
	},

	filenameFields: {
		categories: {
			Track: '트랙',
			Driver: '드라이버',
			Session: '세션',
			Meta: '메타',
		},
		track: '트랙',
		trackFull: '트랙 (전체 이름)',
		trackCity: '도시',
		trackCountry: '국가',
		trackType: '트랙 종류',
		driver: '드라이버',
		driverAbbrev: '드라이버 (약칭)',
		driverInitials: '이니셜',
		team: '팀',
		carNumber: '차량 번호',
		car: '차량',
		carFull: '차량 (전체 이름)',
		carClass: '차량 클래스',
		iRating: 'iRating',
		sessionType: '세션 종류',
		sessionName: '세션 이름',
		lap: '랩',
		date: '날짜',
		time: '시간',
		datetime: '날짜+시간',
		counter: '카운터',
	},

	iracingConfig: {
		projections:
			'스크린샷에 세로 줄무늬가 생기지 않도록 iRacing에서 "Render Scene Using 3 Projections"를 끄세요 (Display > Monitor 탭)',
	},

	graphicsProfiles: {
		title: '그래픽 프로필',
		description:
			'iRacing 그래픽 설정을 저장해 두고 서로 전환합니다 — 레이싱용 삼중 화면 구성과 스크린샷용 단일 화면 구성처럼.',
		iracingRunning:
			'전환하기 전에 iRacing을 종료하세요. iRacing은 종료할 때 그래픽 설정을 다시 기록하므로 변경한 내용이 되돌려집니다.',
		activeHeading: '현재 설정',
		active: {
			clean: '{name} 프로필과 일치합니다.',
			modified: {
				other: '{name}을(를) 기준으로 하며, 이후 {count}개 설정이 바뀌었습니다.',
			},
			modifiedUnknownCount:
				'{name}을(를) 기준으로 하며, 이후 변경되었습니다.',
			unknown: '저장된 어떤 프로필과도 일치하지 않습니다.',
			missing: 'iRacing 그래픽 설정을 찾을 수 없습니다.',
		},
		badge: {
			active: '적용 중',
			modified: '변경됨',
		},
		empty: {
			title: '아직 저장된 프로필이 없습니다.',
			body: '현재 iRacing 설정을 프로필로 저장하거나 기존 .ini 파일을 가져오세요.',
		},
		invalidProfile: '그래픽 설정 파일이 아님',
		warnings: {
			autoCfgIncomplete: 'iRacing이 초기화함',
		},
		actions: {
			apply: '적용',
			overwrite: '현재 설정으로 업데이트',
			rename: '이름 변경',
			export: '내보내기',
			delete: '삭제',
			save: '저장',
			cancel: '취소',
			saveCurrent: '현재 설정을 다른 이름으로 저장…',
			import: '가져오기…',
			openFolder: '폴더 열기',
		},
		prompt: {
			namePlaceholder: '프로필 이름',
			deleteConfirm: '{name}을(를) 삭제할까요?',
		},
		feedback: {
			applied: '{name}을(를) 적용했습니다. 반영하려면 iRacing을 실행하세요.',
			saved: '{name}(으)로 저장했습니다.',
			overwritten: '{name}을(를) 현재 설정으로 업데이트했습니다.',
			renamed: '{name}(으)로 이름을 바꿨습니다.',
			deleted: '{name}을(를) 삭제했습니다.',
			imported: '{name}(으)로 가져왔습니다.',
			exported: '{name}을(를) 내보냈습니다.',
		},
		errors: {
			empty: '프로필 이름을 입력하세요.',
			illegalCharacters:
				'프로필 이름에는 다음 문자를 쓸 수 없습니다: < > : " / \\ | ? *',
			reservedName: 'Windows가 예약해 둔 이름입니다. 다른 이름을 고르세요.',
			trailingDotOrSpace:
				'프로필 이름은 마침표나 공백으로 끝날 수 없습니다.',
			tooLong: '이름이 너무 깁니다.',
			duplicate: '같은 이름의 프로필이 이미 있습니다.',
			profileNotFound: '해당 프로필을 더 이상 찾을 수 없습니다.',
			profileExists: '같은 이름의 프로필이 이미 있습니다.',
			duplicateContent: '설정이 완전히 같은 프로필({name})이 이미 있습니다.',
			noActiveConfig: '저장할 iRacing 그래픽 설정을 찾을 수 없습니다.',
			invalidIni:
				'이 파일은 iRacing 그래픽 설정이 아니므로 사용하지 않았습니다.',
			iracingRunning:
				'먼저 iRacing을 종료하세요 — 종료할 때 이 변경 내용을 덮어씁니다.',
			ioError: '파일을 기록하지 못했습니다. 아무것도 바뀌지 않았습니다.',
		},
	},

	wgc: {
		cursorCaveat:
			'이 버전의 Windows에서는 캡처에 마우스 커서가 나타날 수 있습니다. 커서를 숨기는 설정은 Windows 10 버전 2004에서 추가되었습니다.',
		addonUnavailable:
			'이 시스템에서 고품질 캡처 구성 요소를 불러오지 못했습니다.',
		osUnsupported:
			'이 버전의 Windows에서는 Windows.Graphics.Capture를 사용할 수 없습니다. Windows 10 버전 1903 이상이 필요합니다.',
		// A reason, not a sentence — it is the tail of "이 컴퓨터에서는 장노출을
		// 사용할 수 없습니다: …".
		nativeCaptureOff: '고품질 캡처(WGC)가 꺼져 있음',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing이 전용 전체 화면 모드이므로 스크린샷이 검게 나옵니다. iRacing에서 Display > Full Screen을 OFF로 설정하고(Borderless 또는 Windowed 사용) 다시 시도하세요.',
		exclusiveFullscreenUnattributed:
			'어떤 프로그램이 전용 전체 화면 모드로 실행 중이어서 캡처가 검게 나옵니다. iRacing이 전체 화면 모드라면 Display > Full Screen을 OFF로 설정하고(Borderless 또는 Windowed 사용) 다시 시도하세요.',
		unknownError: '알 수 없는 스크린샷 오류',
		outputTooSmall: '캡처 결과가 너무 작습니다 ({width}x{height})',
		blackFrame:
			'캡처한 프레임이 검습니다 — 캡처 소스가 실패했을 수 있습니다 (일부 Windows 환경에서는 GPU 가속 화면을 캡처하지 못합니다)',
		noSource: '{windowId} 창에 대한 데스크톱 캡처 소스를 찾을 수 없습니다',
		metadataTimeout: '캡처 영상 메타데이터를 기다리다 시간이 초과되었습니다',
		noVideoFrame: '캡처 스트림이 영상 프레임을 하나도 만들어 내지 못했습니다',
		dimensionTimeout:
			'창 크기 {width}x{height}을(를) 기다리다 시간이 초과되어 {actualWidth}x{actualHeight}(으)로 진행합니다',
	},

	longExposureCapture: {
		busy: '이미 캡처가 진행 중입니다.',
		needsNativeCapture:
			'장노출에는 고품질 캡처(WGC)가 필요합니다. 사용하려면 설정에서 켜세요.',
		unavailable: '이 컴퓨터에서는 장노출을 사용할 수 없습니다.',
		noTelemetry:
			'장노출에는 iRacing의 리플레이 텔레메트리가 필요합니다. 시뮬레이터가 실행 중이고 세션에 들어가 있는지 확인하세요.',
		windowNotFound: 'iRacing 창을 찾을 수 없습니다.',
		cancelled: '캡처를 취소했습니다.',
		seekTimeout:
			'리플레이가 제때 {frame} 프레임에 도달하지 못했습니다. 아직 불러오는 중일 수 있습니다.',
		noPasses: '캡처는 최소 한 번의 패스를 실행해야 합니다.',
		playbackStalled:
			'리플레이가 재생되지 않았습니다. 다른 도구가 iRacing을 일시 정지시키지 않았는지 확인하세요.',
		exposureTimeout:
			'노출이 {seconds}초 안에 {frame} 프레임에 도달하지 못했습니다.',
		endedEarly: '선택한 순간에 이르기 전에 노출이 끝났습니다.',
		noFramesPresented:
			'iRacing이 캡처할 프레임을 하나도 표시하지 않았습니다.',
		subFrameNoSamples:
			'이 셔터는 리플레이 한 프레임보다 짧은데, iRacing이 그 안에서 프레임을 렌더링하지 않았습니다. 재생 속도를 낮추거나 한 단계 느린 셔터를 사용해 보세요.',
		noSamples:
			'누적된 프레임이 없습니다. 노출 중에 iRacing이 렌더링을 멈췄을 수 있습니다.',
		blankCapture:
			'캡처한 프레임이 모두 검어서 저장할 이미지가 없습니다. iRacing이 전용 전체 화면이 아니라 창 모드나 테두리 없는 모드인지, 그리고 이 해상도에서 비디오 메모리가 아직 남아 있는지 확인하세요. 캡처 해상도를 낮춰 보는 것이 가장 빠른 확인 방법입니다.',
		frozenCapture:
			'노출 중에 iRacing이 {samples} 프레임을 표시했지만 모두 똑같아서, 이 이미지는 장노출이 아니라 정지 사진입니다. 리플레이가 흘러가는 동안 iRacing이 새로 렌더링한 것이 없습니다.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'GPU가 이미지를 반환하지 않았습니다.',
		bracketShortfall:
			'브라케팅이 {asked}개 스톱을 요청했지만 {returned}개만 돌아왔습니다 — 나머지가 처리에 실패했거나, 이 버전의 캡처 애드온이 브라케팅보다 오래된 것입니다.',
	},

	validation: {
		windowBeforeStart:
			'노출에는 선택한 순간 이전에 {frames} 리플레이 프레임이 필요하지만, 그 지점은 리플레이 시작에서 {anchor} 프레임밖에 지나지 않았습니다. 더 나중의 순간을 고르거나 더 빠른 셔터를 사용하세요.',
		pastEnd: '선택한 순간이 리플레이의 끝을 넘어갑니다.',
		sessionChanged:
			'이 사진을 준비한 뒤로 리플레이가 다른 세션으로 넘어갔습니다. 순간을 다시 선택하세요.',
		singleSampleMultiPass:
			'이 셔터는 한 패스당 약 한 프레임만 들어갈 만큼 짧아서, {passes}번의 패스로 대략 {passes}개의 샘플만 모입니다. 재생 속도를 낮추거나 더 느린 셔터를 쓰면 훨씬 많이 얻을 수 있습니다.',
		singleSample:
			'이 셔터는 프레임이 한 장만 들어갈 만큼 짧아서 결과에 모션 블러가 생기지 않습니다. 재생 속도를 낮추거나 더 느린 셔터를 쓰면 샘플을 모을 수 있습니다.',
		bracketVsInterpolation:
			'셔터 브라케팅과 {factor}x 프레임 보간은 함께 실행할 수 없으므로, 이 사진은 보간 없이 촬영됩니다. 추가 스톱보다 중간 프레임이 더 중요하다면 브라케팅을 끄세요.',
		passesVsInterpolation:
			'다중 패스와 {factor}x 보간이 모두 켜져 있습니다. 둘은 서로 경쟁합니다. 보간이 각 패스를 늦춰 실제 프레임을 잃게 만들므로, 같은 시간을 기다려도 패스만 쓸 때보다 실제 샘플이 적습니다. 보간을 끄는 편이 대체로 더 나은 사진을 만듭니다.',
		shortOfTarget:
			'1/{divisor} 속도에서도 이 노출은 약 {samples}개의 샘플에 그쳐, 요청한 {target}개에 못 미칩니다. 더 모으려면 셔터를 길게 하세요.',
		longCaptureEscalate:
			'이 캡처는{passSuffix} 리플레이를 1/{divisor} 속도로 약 {duration}의 실제 시간 동안 실행하며, 한 번 시작하면 서두를 수 없습니다. {advice}',
		longCaptureWarn:
			'이 캡처는{passSuffix} 1/{divisor} 재생 속도로 약 {duration}의 실제 시간이 걸립니다.',
		// A fragment spliced into the two messages above, so it leads with a space.
		passSuffix: ' 같은 순간을 {passes}번의 패스로 훑으면서',
		adviceFewerPasses: '패스를 줄이면 샘플은 적지만 더 빨리 끝납니다.',
		adviceFasterPlayback:
			'재생 속도를 높이면 샘플은 적지만 더 빨리 끝납니다.',
		pastLogCap:
			'이 캡처는 {passes}번의 패스에서 약 {samples}개의 샘플을 모을 것으로 예상되며, 이는 진단 로그가 담을 수 있는 {cap}개를 넘습니다. 이미지에는 영향이 없고, 고르기와 간격 수치만 캡처의 앞부분을 설명하게 됩니다.',
		interpolationLossy:
			'이 크기에서는 {factor}x 보간이 전에도 이 컴퓨터에서 실제 샘플을 잃게 만들었습니다. 더 낮은 배수나 더 낮은 해상도를 쓰거나, 대신 패스를 늘리는 것을 고려하세요.',
	},

	duration: {
		zero: '0초',
		seconds: {
			other: '{count}초',
		},
		minutes: {
			other: '{count}분',
		},
		minutesSeconds: '{minutes}분 {seconds}초',
	},
};

export default ko;
