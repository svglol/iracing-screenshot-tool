// Japanese. Translated from en.ts — see that file's header before editing.
//
// NOTE ON PLURALS. Japanese has no grammatical plural: every plural node supplies
// only `other`, the sole category Intl.PluralRules('ja') ever selects.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.
// iRacing's own menu labels (Display > Full Screen, Borderless, Shot Selection)
// stay in English too, because that is what the user reads on screen in the sim.

import type { Catalog } from './index';

const ja: Catalog = {
	notice: {
		danger: '問題',
		warning: '知っておきたいこと',
		info: '補足',
	},

	promo: {
		greeting:
			'iRacing Screenshot Tool をご利用いただきありがとうございます！',
		signature: 'AR Media Solutions が開発・提供しています。',
	},

	changelog: {
		title: '変更履歴',
		untitledRelease: 'リリース',
	},

	gallery: {
		menu: {
			openExternally: '別のアプリで開く',
			openFolder: 'フォルダーを開く',
			copy: 'コピー',
			delete: '削除',
		},
		copiedToClipboard: '{name} をクリップボードにコピーしました',
	},

	sidebar: {
		resolution: '解像度',
		width: '幅',
		height: '高さ',
		// Carries its own colon, so the spacing convention is chosen here.
		output: '出力:',
		cropWatermark: 'ウォーターマークをトリミング',
		keepAspectRatio: 'アスペクト比を維持',
		screenshot: 'スクリーンショット',
		custom: 'カスタム',
		vramStatus: '{adapter}{total} 中 {free} 空き',
		savedSuccessfully: '{name} を保存しました',
		screenshotFailed: 'スクリーンショットに失敗しました: {message}',
		errorLogPrefix: 'ログ: ',
		notices: {
			exclusiveFullscreen:
				'iRacing が排他的フルスクリーンで動作しているため、スクリーンショットは真っ黒になります。iRacing で Display > Full Screen を OFF（Borderless または Windowed）に設定すると撮影できます。',
			vramRisk:
				'{resolution} にはあと約 {needed} の VRAM が必要ですが、空きは {free} しかありません。iRacing がメモリ不足でクラッシュする可能性が高いです。',
			vramCaution:
				'{resolution} は VRAM の余裕がほとんど残らず（空き {free}）、負荷の高いトラックと車の組み合わせではクラッシュするおそれがあります。',
			switchResolution: '{resolution} に切り替える',
			vramStatic:
				'高い解像度では VRAM が不足すると iRacing がクラッシュすることがあります。トラックと車の組み合わせによっては、より多くの VRAM が必要になります。',
			reshade:
				'iRacing Screenshot Tool のスクリーンショットボタンを押したあと、ReShade のスクリーンショット用キーを押す必要があります。',
			crop: '「ウォーターマークをトリミング」は最終的な画像をわずかに拡大します。画面の端に近い部分は切り取られます。',
			aspectRatio:
				'「アスペクト比を維持」は、既定の 16:9 ではなくお使いのモニターのアスペクト比（21:9 ウルトラワイドなど）に合わせてスクリーンショットの高さを調整します。幅は選択した解像度で決まります。',
		},
	},

	settings: {
		title: '設定',
		version: 'バージョン - {version}',
		changelog: '変更履歴',
		openLogsFolder: 'ログフォルダーを開く',
		checkForUpdates: '更新を確認',
		updateCheckFailed: '更新の確認に失敗しました: {message}',

		language: '言語',
		languageDescription:
			'アプリ全体で使用する言語です。初回起動時に Windows の設定から検出されます。',

		screenshotFolder: 'スクリーンショットフォルダー',
		selectFolder: 'フォルダーを選択',
		screenshotKeybind: 'スクリーンショットのキー割り当て',
		editBind: 'キーを変更',

		customFilenameFormat: 'カスタムファイル名形式',
		customFilenameFormatDescription:
			'既定（{track}-{driver}-{counter}）の代わりに独自のパターンを使用します',
		filenameFieldsHint:
			'フィールドをクリックすると形式に追加されます。区切り文字（-、_ など）は直接入力してください。',
		reset: 'リセット',
		preview: 'プレビュー:',

		outputFormat: '出力形式',
		formatJpeg: 'JPEG（最高品質）',
		formatPng: 'PNG（可逆圧縮）',
		formatWebp: 'WebP（品質 95%）',

		disableTooltips: 'ツールチップを無効にする',
		disableTooltipsDescription: '説明は不要です、使い方はわかっています',

		cropTopLeft: '左上を優先してウォーターマークをトリミング',
		cropTopLeftDescription:
			'右下の角だけを切り取ります（3%）。オフの場合は、中央に収まるように四辺から均等に（合計 6%）切り取ります。',

		manualWindowRestore: '手動でウィンドウを復元',
		manualWindowRestoreDescription:
			'自動のウィンドウ復元を上書きし、指定した位置とサイズを使用します。ウルトラワイドや Nvidia Surround をお使いの場合に便利です',
		left: '左',
		top: '上',
		width: '幅',
		height: '高さ',
		restoreNow: '今すぐ復元',

		nativeCapture: '高忠実度キャプチャ（WGC）',
		nativeCaptureDescription:
			'既定のパイプライン（色をサブサンプリングします）ではなく Windows.Graphics.Capture を使い、サブサンプリングされていない本来の色でキャプチャします。キャプチャに失敗した場合は自動的に既定の方式へ戻ります。',
		nativeCaptureUnavailable:
			'このシステムでは利用できません。高忠実度キャプチャは動作しません。',
		nativeCaptureUnverified:
			'Windows はサポートしていると報告していますが、テストキャプチャが返ってきませんでした。失敗が続く場合は自動的に既定の方式へ戻ります。',

		reshade: 'ReShade 互換モード',
		reshadeDescription:
			'ReShade を使用する場合は、まず iRacing Screenshot Tool のホットキーを押すかボタンをクリックし、iRacing のウィンドウのサイズが変わってから ReShade のスクリーンショット用ホットキーを押してください',
		reshadeIni: 'ReShade の INI ファイル',
		selectFile: 'ファイルを選択',
	},

	longExposure: {
		title: '長時間露光',
		shutter: 'シャッター',
		playbackSpeed: '再生速度',
		playbackAuto: '自動（目標サンプル数から）',
		playbackRealTime: '1x（実時間）',
		targetSamples: '目標サンプル数',
		advanced: '詳細設定',
		defaultsSummary: '既定値 {count} 件',

		weighting: '重み付け',
		weightingBox: 'Box（均等）',
		weightingLinear: 'Linear（終わりがシャープ）',
		weightingEase: 'Ease（先頭がよりシャープ、長い尾）',

		interpolation: 'フレーム補間',
		interpolationOff: 'オフ',
		interpolation2: '2×（中間フレーム 1 枚）',
		interpolation4: '4×（中間フレーム 3 枚）',
		interpolation8: '8×（中間フレーム 7 枚）',

		passes: 'パス数',
		passes1: '1（シングルパス）',
		passes2: '2× — 待ち時間は 2 倍',
		passes4: '4× — 待ち時間は 4 倍',
		passes8: '8× — 待ち時間は 8 倍',

		bracket: 'シャッターのブラケット撮影',
		highlightRecovery: 'ハイライト復元（段）',

		cancel: 'キャンセル',
		saved: '長時間露光を保存しました — サンプル数 {count}',
		failed: '長時間露光に失敗しました',

		// Fragments in a comma-separated summary line, not sentences. The weighting
		// names stay in Latin script because the option labels above do too.
		modified: {
			weighting_linear: 'linear',
			weighting_ease: 'ease',
			interpolation: '{factor}× 補間',
			passes: {
				other: '{count} パス',
			},
			bracketed: 'ブラケット撮影',
			recovery: '復元 {stops} 段',
		},

		progress: {
			working: '処理中…',
			seeking: 'シーク中…{pass}',
			accumulating: '露光中… サンプル数 {count}{pass}',
			resolving: '現像中…',
			restoring: 'リプレイを復元中…',
			pass: '（パス {current}/{total}）',
		},

		notices: {
			needsNativeCapture:
				'長時間露光には高忠実度キャプチャ（WGC）が必要ですが、現在オフになっています。設定でオンにすると長時間露光を使用できます。',
			unavailableWithReason:
				'このパソコンでは長時間露光を利用できません: {reason}',
			unavailable: 'このパソコンでは長時間露光を利用できません。',
			interpolationCost:
				'補間は実際のフレームの間に新しいフレームを作り出し、軌跡を滑らかにします。1 フレームごとに GPU の時間を消費するため、保存した写真の実サンプル数を、補間をオフにした同じ写真と比べてください。その数が減っているなら、作り出したサンプルを実際のサンプルと引き換えに買っていることになります。',
			passesAndInterpolation:
				'パス数と補間は同じ 1 フレームあたりの処理時間を奪い合います。両方をオンにすると各パスで取り込める実フレームが減るため、同じ待ち時間なら補間をオフにしたほうが良い写真になるのが普通です。',
			passes:
				'各パスは同じ瞬間を再生し直し、他のパスが取りこぼしたフレームを拾います。そのため軌跡は明るくなるのではなく滑らかになります。1 回のパスではわずかなサンプルしか集まらない高速シャッターで特に効果的です。',
			interpolationUnsupported:
				'フレーム補間には NVIDIA Turing 以降の GPU が必要です{adapter}。長時間露光のそれ以外の動作は通常どおりです。',
			interpolationAdapter:
				'（このキャプチャは {adapter} で動作しています）',
			reshade:
				'長時間露光はネイティブにキャプチャし ReShade を経由しないため、ReShade のエフェクトは結果に現れません。',
		},
	},

	help: {
		title: 'ヘルプ',
		sections: 'ヘルプの項目',
		tabGeneral: '基本',
		tabLongExposure: '長時間露光',
		tabFaq: 'FAQ',

		general: {
			iracingSettings: 'iRacing の設定',
			borderless: 'iRacing は Windowed Borderless で実行する必要があります',
			vram: '8K 以上の解像度でスクリーンショットを撮るには、8GB 以上の VRAM を推奨します',
			newerContent: '新しいトラックや車ほど多くの VRAM が必要になります',
			shrinkUi:
				'「ウォーターマークをトリミング」を使う場合は、撮影前に iRacing の UI を最小まで縮小してください。「Control+PageDown」で縮小できます。うまくいかない場合は、iRacing の設定で UI ズームをリセットする必要があるかもしれません',

			screenshotFolder: 'スクリーンショットフォルダー',
			screenshotFolderBody:
				'スクリーンショットは既定で「C:\\Users\\user\\Pictures\\Screenshots」に保存されます。保存先は設定で変更できます',

			screenshotHotkey: 'スクリーンショットのホットキー',
			screenshotHotkeyBody:
				'既定では「Control + PrintScreen」で現在の設定のままスクリーンショットを撮影します。設定で変更できます。',

			issues: '不具合',
			issuesBody: '問題が発生した場合は、次の場所でご報告ください:',
			discord: 'Discord',

			instructions: '手順',
			step1: 'iRacing は Windowed Borderless モードで実行する<b>必要があります</b>',
			step2: 'iRacing を起動し、スクリーンショットを撮りたい位置にカメラを設定します',
			step3: '使いたい解像度を選びます（8K に上げる前に、まず低い解像度で試してください）',
			step4: 'iRacing のウォーターマークをトリミングするかどうかを選びます。トリミングする場合は、先に「Control + PageDown」で iRacing の UI を最小サイズまで縮小してください',
			step5: 'スクリーンショットボタンを押すか、ホットキー「Control + PrintScreen」を使って撮影します',
			step6: '選んだ解像度によっては数秒かかることがあります。iRacing の画面が元のサイズに戻れば完了です',
			step7: 'スクリーンショットは「C:\\Users\\{User}\\Pictures\\Screenshots」に保存されます',
		},

		longExposure: {
			whatItDoes: '機能の概要',
			whatItDoesBody:
				'長時間露光は、カメラのシャッターを開いたままにするのと同じように、リプレイの多数のフレームを 1 枚の画像に合成します。静止しているものはシャープなまま、動いているものは軌跡になります。このツールはリプレイ自体を操作し、シムが表示するすべてのフレームを取り込んで GPU 上で加算します。',

			shutter: 'シャッター',
			shutterBody:
				'<i>リプレイ時間で</i>露光がどれだけ続くかを、リプレイ 1 フレームの何分の一かから 10 秒までの範囲で指定します。軌跡の長さを決めるのがこの設定です。シャッターが長いほど多くのフレームが集まるため、以下の設定に頼る必要が少なくなります。最も速い段はリプレイ 1 フレーム分にとどまり、集まるサンプルはわずかです。',

			playback: '再生速度',
			playbackBody:
				'露光を取り込む間、リプレイはスローモーションで再生されます。これによりシムはリプレイ時間 1 秒あたりにより多くのフレームを表示し、合成に使えるサンプルが増えます。1/16 は実時間のおよそ 16 倍のフレームを集めますが、実時間でも 16 倍かかります。これがこのパネルの主な取引です。滑らかさを忍耐で買うわけです。',
			playbackAutoBody:
				'「自動（目標サンプル数から）」は<b>目標サンプル数</b>から速度を決めます。指定した枚数に到達できる最も速い再生速度をツールが計算します。待ち時間の上限を決めたい場合は、速度を明示的に指定してください。',

			weighting: '重み付け',
			weightingBody:
				'取り込んだ各フレームが結果にどれだけ寄与するかです。<b>Box</b> はすべてを均等に扱い、一様な軌跡になります。<b>Linear</b> は露光の終わりに向かって重みを増すため、被写体は動き終わった位置で最もシャープになり、通ってきた経路に沿って薄れていきます。<b>Ease</b> は同じ考え方で、先頭がよりシャープ、尾がより長くなります。',

			interpolation: 'フレーム補間',
			interpolationBody:
				'GPU のオプティカルフローエンジンを使って実際のフレームの間に追加のフレームを作り出し、軌跡の隙間を埋めます。NVIDIA Turing 以降のカードが必要で、対応していないハードウェアでは項目自体が表示されません。',
			interpolationCostBody:
				'無料ではありません。取り込むフレームごとに GPU の時間を消費し、その予算は iRacing の 1 フレーム分です。処理が追いつかなくなると、合成フレームを作るために<i>実際の</i>フレームを取りこぼし始め、差し引きでは損になります。軌跡は短く粗くなります。コストはメガピクセル数と倍率の積に比例するため、2560×1440 で余裕があっても 8K では成り立ちません。確かめるには、同じ瞬間をオンとオフで 2 回撮影し、実サンプル数を比べてください。写真が目標に届かなかった場合は、アプリも撮影後に警告します。',

			passes: 'パス数',
			passesBody:
				'同じ瞬間を複数回訪れ、1 枚の画像に累積します。各パスは他のパスがたまたま取りこぼしたフレームを拾うため、軌跡は明るくなるのではなく滑らかになります。結果は各ピクセルに実際に届いた光の量で正規化されるからです。',
			passesTradeBody:
				'パス数は補間と同じものを、別の通貨で買います。GPU の時間ではなく実時間です。8 パスはおよそ 8 倍の時間がかかりますが、実際のフレームを失うことは決してありません。そのため、補間が追いつかない高解像度や、1 パスではごくわずかなサンプルしか集まらない高速シャッターでは、こちらが正しいレバーになります。両方を同時に使うのはたいてい最悪の選択です。同じ 1 フレームあたりの予算を奪い合うからです。',

			bracket: 'シャッターのブラケット撮影',
			bracketBody:
				'1 回のキャプチャから、選んだシャッター段とそれより速い各段の画像を 1 枚ずつ書き出します。1/60 で撮ると 1/125、1/250、1/500、1/1000 も得られ、同じ瞬間を段階的に短い軌跡で見比べられます。当てずっぽうで撮り直す代わりに、あとから好みの表現を選べます。',
			bracketCostBody:
				'追加の時間はほとんどかかりません。どの段も同じフレームで終わり、違うのはどこまでさかのぼるかだけです。速いシャッターは、すでに流れていくフレームの末尾にすぎません。すべてリプレイ 1 回の走査から埋められます。',
			bracketMemoryBody:
				'代わりにかかるのはメモリです。各段にフル解像度のアキュムレーターが 1 つずつ必要なので、11 段では 1 段の 11 倍のビデオメモリを使い、8K では大半のカードの容量を超えます。キャプチャは開始前にこれを確認し、iRacing をクラッシュさせるくらいなら実行を断ります。ブラケット撮影が断られた場合は、解像度を下げるか、より速いシャッターを選んでください。段数も短くなります。',
			bracketNamingBody:
				'選んだ段は通常のファイル名で保存され、ギャラリーに表示されるのもこれです。他の段はその隣に、ファイル名にシャッター速度を付けて並びます。',

			highlights: 'ハイライト復元',
			highlightsBody:
				'フレームを加算する前に白飛び寸前のハイライトを持ち上げ、最後にその持ち上げを元に戻します。iRacing はすでにトーンマッピングされた画像を渡してくるため、ヘッドライトと白い壁が同じ値で届きます。それをそのまま平均すると、露光の一部を横切る明るい光が、明るい軌跡ではなく灰色のにじみとして写ります。この設定は、実際のセンサーが持つ非線形性を本来の位置に戻します。単位は段で、0 はオフ、何も変わりません。',

			whatItSaves: '保存されるもの',
			whatItSavesBody:
				'サイズ、ウォーターマークのトリミング、ファイル形式は、通常のスクリーンショットと同じ設定に従います。上にある「解像度」と「ウォーターマークをトリミング」、そして設定の出力形式です。サイドバー上部の「出力」の行に、実際に得られるものがそのまま表示されます。',
			whatItSavesPngBody:
				'PNG を選ぶと本物の 16 ビットのマスターが書き出されます。あとで色を調整するつもりなら価値がありますし、ギャラリー用の 8 ビットのプレビューも一緒に保存されます。ただし高解像度では書き出しがかなり遅くなります。3300 万画素の 16 ビット PNG は 10 秒ほどかかりますが、同じフレームを JPEG にすれば 1 秒未満です。',

			troubleshooting: '結果がおかしいとき',
			troubleGhosts:
				'<b>滑らかな軌跡ではなく飛び飛びの残像になる</b> — サンプルが足りません。再生速度を遅くするか、パス数を増やすか、解像度を下げてください。',
			troubleShutter:
				'<b>どのシャッターにしたいか決めきれない</b> — シャッターのブラケット撮影をオンにすれば、同じ待ち時間であとから選べます。',
			troubleHighlights:
				'<b>ハイライトが白飛びする、または平坦になる</b> — ハイライト復元を 3〜5 段で試してください。',
			troubleBlack:
				'<b>真っ黒な画像になる</b> — iRacing が排他的フルスクリーンです。Display &gt; Full Screen を OFF に設定してください。',
			troubleSidecar:
				'すべての撮影は、使用した設定そのもの、サンプル数、サンプルがどれだけ均等に並んだかを、ログフォルダー内の app.log と同じ場所に .json ファイルとして記録します。直近 20 件の撮影が保持され、ブラケット撮影は 1 件として数えます。そのため、いま問い合わせようとしている撮影の記録はまだ残っています。',
		},

		faq: {
			blackShot: '写真が真っ黒なのに iRacing の UI は写っている',
			blackShotBody:
				'キャプチャ自体は成功しています。オーバーレイが描画されている以上、実際のフレームがツールに届いています。欠けているのは 3D シーンで、iRacing がそれを黒く描画したためです。一般的でないカメラのいくつかがこの挙動になります。特に多いのはサスペンションカメラです。通常のカメラ（コックピット、追走、または TV カメラのいずれか）に切り替えて、同じ瞬間をもう一度撮影してください。',
			blackShotFullscreenBody:
				'UI <i>も含めて</i>画像が真っ黒で、どのカメラでも同じ場合は、原因が異なります。iRacing が排他的フルスクリーンになっており、これはシムの外側からは何もキャプチャできません。Display &gt; Full Screen を OFF に設定してください。',

			cameraReset: '撮影の直前に iRacing がカメラを動かしてしまう',
			cameraResetBody:
				'それはこのツールではなく、iRacing 自身の自動ショット選択です。オンになっている間、iRacing は自分でカメラを選び続け、キャプチャが始まる瞬間に既定の構図へ戻してしまうため、用意した構図とは違う写真になります。',
			cameraResetFixBody:
				'iRacing のカメラツール（Ctrl+F12）の <b>Camera &gt; Config &gt; Preferences</b> にある、<b>Shot Selection</b> の <b>Automatic</b> スイッチでオフにできます。オフにすれば、通常のスクリーンショットでも長時間露光でも、カメラは設定した位置のままになります。',
		},
	},

	update: {
		checking: '更新を確認しています…',
		newVersion: '新しいバージョン',
		availableBusy:
			'{version} が利用可能です。キャプチャの実行中です。完了後にダウンロードできます。',
		available: '{version} が利用可能です。クリックするとダウンロードします。',
		downloading: '{version} をダウンロードしています…',
		downloadingPercent: '{version} をダウンロードしています — {percent}%',
		downloadedBusy:
			'{version} の準備ができました。キャプチャの実行中のため、アプリを終了したときにインストールされます。',
		downloaded:
			'{version} の準備ができました。クリックすると再起動してインストールします。',
		failed: '更新の確認に失敗しました: {error}',
		unknownError: '不明なエラー',
		neverChecked: 'まだ更新を確認していません。',
		upToDate: '最新のバージョンです。',

		alreadyDownloading: '更新はすでにダウンロード中です。',
		alreadyDownloaded: '更新はすでにダウンロード済みです。',
		nothingToDownload: 'ダウンロードできる更新はありません。',
		captureInProgress:
			'キャプチャの実行中です。完了してからもう一度お試しください。',
		nothingToInstall: 'インストールできる更新はありません。',
		captureInProgressInstall:
			'キャプチャの実行中です。更新はアプリを終了したときに自動的にインストールされます。',
		devBuildOnly: '更新の確認はインストール済みのビルドでのみ動作します。',

		installTitle: '更新をインストール',
		installMessage: 'バージョン {version} をインストールしますか？',
		installFallbackVersion: '更新',
		installDetail:
			'更新のインストール後、アプリはいったん終了して再び開きます。「あとで」を選んだ場合は、次にアプリを終了したときに自動的にインストールされます。',
		installConfirm: '再起動してインストール',
		installLater: 'あとで',
	},

	filenameFields: {
		categories: {
			Track: 'トラック',
			Driver: 'ドライバー',
			Session: 'セッション',
			Meta: 'メタ',
		},
		track: 'トラック',
		trackFull: 'トラック（正式名）',
		trackCity: '都市',
		trackCountry: '国',
		trackType: 'トラック種別',
		driver: 'ドライバー',
		driverAbbrev: 'ドライバー（略称）',
		driverInitials: 'イニシャル',
		team: 'チーム',
		carNumber: 'カーナンバー',
		car: '車',
		carFull: '車（正式名）',
		carClass: '車クラス',
		iRating: 'iRating',
		sessionType: 'セッション種別',
		sessionName: 'セッション名',
		lap: 'ラップ',
		date: '日付',
		time: '時刻',
		datetime: '日付+時刻',
		counter: '連番',
	},

	iracingConfig: {
		projections:
			'スクリーンショットに縦じまが出るのを防ぐため、iRacing の「Render Scene Using 3 Projections」（Display > Monitor タブ）を無効にしてください',
	},

	graphicsProfiles: {
		title: 'グラフィックプロファイル',
		description:
			'iRacing のグラフィック設定を保存して切り替えられます。レース用、スクリーンショット用、動画撮影用と使い分けられます。iRacing は起動時に設定を読み込み、終了時に書き戻すため、起動中に切り替えても元に戻ってしまいます。<b>設定の切り替えは必ずシムを終了してから行ってください。</b>',
		// The most important sentence here: a swap made while iRacing is running is
		// undone at exit with no sign anything failed.
		iracingRunning:
			'切り替える前に iRacing を終了してください。iRacing は終了時にグラフィック設定を書き戻すため、変更が取り消されてしまいます。',
		activeHeading: '現在の設定',
		active: {
			clean: '{name} プロファイルと一致しています。',
			modified: {
				other: '{name} をもとにしていますが、その後 {count} 項目が変更されています。',
			},
			modifiedUnknownCount:
				'{name} をもとにしていますが、その後変更されています。',
			unknown: '保存されているどのプロファイルとも一致しません。',
			missing: 'iRacing のグラフィック設定が見つかりませんでした。',
		},
		badge: {
			active: '使用中',
			modified: '変更あり',
		},
		picker: {
			unknown: 'No matching profile',
			missing: 'No configuration',
		},
		empty: {
			title: 'まだプロファイルが保存されていません。',
			body: '現在の iRacing の設定をプロファイルとして保存するか、既存の .ini ファイルをインポートしてください。',
		},
		invalidProfile: 'グラフィック設定ではありません',
		warnings: {
			autoCfgIncomplete: 'iRacing にリセットされます',
		},
		actions: {
			load: '読み込む',
			overwrite: '現在の設定で更新',
			rename: '名前を変更',
			export: 'エクスポート',
			delete: '削除',
			save: '保存',
			cancel: 'キャンセル',
			saveCurrent: '現在の設定を保存…',
			import: 'インポート…',
			openFolder: 'フォルダーを開く',
		},
		prompt: {
			namePlaceholder: 'プロファイル名',
			deleteConfirm: '{name} を削除しますか？',
		},
		feedback: {
			// The restart caveat is part of the success message: the swap only takes
			// effect at iRacing's next launch.
			loaded:
				'{name} を読み込みました。反映するには iRacing を起動してください。',
			saved: '{name} として保存しました。',
			overwritten: '{name} を現在の設定で更新しました。',
			renamed: '{name} に名前を変更しました。',
			deleted: '{name} を削除しました。',
			imported: '{name} としてインポートしました。',
			exported: '{name} をエクスポートしました。',
		},
		errors: {
			empty: 'プロファイル名を入力してください。',
			illegalCharacters:
				'プロファイル名に次の文字は使用できません: < > : " / \\ | ? *',
			reservedName:
				'その名前は Windows によって予約されています。別の名前を選んでください。',
			trailingDotOrSpace:
				'プロファイル名の末尾にピリオドやスペースは使用できません。',
			tooLong: 'その名前は長すぎます。',
			duplicate: 'その名前のプロファイルはすでに存在します。',
			profileNotFound: 'そのプロファイルは見つからなくなりました。',
			profileExists: 'その名前のプロファイルはすでに存在します。',
			duplicateContent:
				'まったく同じ設定のプロファイル（{name}）がすでに存在します。',
			noActiveConfig:
				'保存できる iRacing のグラフィック設定が見つかりませんでした。',
			invalidIni:
				'そのファイルは iRacing のグラフィック設定ではないため、使用されませんでした。',
			iracingRunning:
				'先に iRacing を終了してください。終了時に変更が上書きされてしまいます。',
			ioError: 'ファイルを書き込めませんでした。何も変更されていません。',
		},
	},

	wgc: {
		cursorCaveat:
			'このバージョンの Windows では、キャプチャにマウスカーソルが写ることがあります。カーソルを隠す設定は Windows 10 バージョン 2004 で追加されました。',
		addonUnavailable:
			'このシステムでは高忠実度キャプチャのコンポーネントを読み込めませんでした。',
		osUnsupported:
			'このバージョンの Windows では Windows.Graphics.Capture を利用できません。Windows 10 バージョン 1903 以降が必要です。',
		// A `reason`, not a sentence — it is shown as the tail of
		// longExposure.notices.unavailableWithReason.
		nativeCaptureOff: '高忠実度キャプチャ（WGC）がオフになっています',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing が排他的フルスクリーンで動作しているため、スクリーンショットは真っ黒になります。iRacing で Display > Full Screen を OFF（Borderless または Windowed）に設定して、もう一度お試しください。',
		exclusiveFullscreenUnattributed:
			'いずれかのアプリケーションが排他的フルスクリーンで動作しているため、キャプチャが真っ黒になります。iRacing がフルスクリーンの場合は、Display > Full Screen を OFF（Borderless または Windowed）に設定して、もう一度お試しください。',
		unknownError: '不明なスクリーンショットエラー',
		outputTooSmall: 'キャプチャ結果が小さすぎます（{width}x{height}）',
		blackFrame:
			'キャプチャしたフレームが真っ黒です。キャプチャ元が失敗した可能性があります（一部の Windows 環境では GPU アクセラレーションされたコンテンツをキャプチャできないことがあります）',
		noSource:
			'ウィンドウ {windowId} に対応するデスクトップキャプチャソースが見つかりません',
		metadataTimeout: 'キャプチャ映像のメタデータの待機がタイムアウトしました',
		noVideoFrame: 'キャプチャストリームが映像フレームを生成しませんでした',
		dimensionTimeout:
			'ウィンドウのサイズ {width}x{height} の待機がタイムアウトしました。{actualWidth}x{actualHeight} のまま続行します',
	},

	longExposureCapture: {
		busy: 'すでにキャプチャが実行中です。',
		needsNativeCapture:
			'長時間露光には高忠実度キャプチャ（WGC）が必要です。使用するには設定でオンにしてください。',
		unavailable: 'このパソコンでは長時間露光を利用できません。',
		noTelemetry:
			'長時間露光には iRacing のリプレイテレメトリが必要です。シムが起動していて、セッション中であることを確認してください。',
		windowNotFound: 'iRacing のウィンドウが見つかりません。',
		cancelled: 'キャプチャをキャンセルしました。',
		seekTimeout:
			'リプレイが時間内にフレーム {frame} へ到達しませんでした。まだ読み込み中の可能性があります。',
		noPasses: 'キャプチャには少なくとも 1 パスが必要です。',
		playbackStalled:
			'リプレイの再生が始まりませんでした。iRacing が他のツールによって一時停止されていないか確認してください。',
		exposureTimeout:
			'露光が {seconds} 秒以内にフレーム {frame} へ到達しませんでした。',
		endedEarly: '選択した瞬間に到達する前に露光が終了しました。',
		noFramesPresented:
			'iRacing がキャプチャできるフレームを 1 枚も表示しませんでした。',
		subFrameNoSamples:
			'このシャッターはリプレイ 1 フレームより短く、その間に iRacing はフレームを描画しませんでした。再生速度を遅くするか、1 段遅いシャッターをお試しください。',
		noSamples:
			'フレームが 1 枚も蓄積されませんでした。露光中に iRacing の描画が止まった可能性があります。',
		blankCapture:
			'キャプチャしたフレームがすべて真っ黒だったため、保存できる画像がありません。iRacing が排他的フルスクリーンではなくウィンドウまたはボーダーレスで動作しているか、そしてこの解像度でまだビデオメモリに空きがあるかを確認してください。キャプチャ解像度を下げるのが最も手早い確認方法です。',
		frozenCapture:
			'露光中に iRacing は {samples} 枚のフレームを表示しましたが、すべて同一だったため、この画像は長時間露光ではなく静止画です。リプレイが進む間、iRacing は新しい描画を行いませんでした。',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'GPU が画像を返しませんでした。',
		bracketShortfall:
			'ブラケット撮影は {asked} 段を要求しましたが、返ってきたのは {returned} 段でした。残りは解決に失敗したか、このビルドのキャプチャアドオンがブラケット撮影より古い可能性があります。',
	},

	validation: {
		windowBeforeStart:
			'露光には選択した瞬間より前に {frames} 枚のリプレイフレームが必要ですが、その瞬間はリプレイ開始から {anchor} 枚しか進んでいません。もっと後の瞬間か、より速いシャッターを選んでください。',
		pastEnd: '選択した瞬間はリプレイの終端を過ぎています。',
		sessionChanged:
			'この撮影を設定してから、リプレイが別のセッションに移りました。瞬間を選び直してください。',
		singleSampleMultiPass:
			'このシャッターは短く、1 パスあたり約 1 枚しかフレームが収まりません。そのため {passes} パスでもおよそ {passes} サンプルにしかなりません。再生速度を遅くするか、シャッターを遅くするほうがはるかに多く得られます。',
		singleSample:
			'このシャッターは短く、収まるフレームは 1 枚だけです。そのため結果に被写体ブレは生じません。再生速度を遅くするか、シャッターを遅くするとサンプルが得られます。',
		bracketVsInterpolation:
			'シャッターのブラケット撮影と {factor}x のフレーム補間は同時に実行できないため、この撮影は補間なしで行われます。中間フレームのほうが追加の段数より重要な場合は、ブラケット撮影をオフにしてください。',
		passesVsInterpolation:
			'マルチパスと {factor}x の補間が両方オンになっています。両者は競合します。補間は各パスを遅くして実フレームを失わせるため、同じ待ち時間でもパス数だけの場合より実サンプルが少なくなります。補間をオフにしたほうが良い写真になるのが普通です。',
		shortOfTarget:
			'1/{divisor} の速度でも、この露光で得られるサンプルは約 {samples} で、要求された {target} に届きません。もっと多く得るには、より遅いシャッターを使ってください。',
		longCaptureEscalate:
			'このキャプチャはリプレイを 1/{divisor} の速度で再生し、実時間で約 {duration} かかります{passSuffix}。開始後に早めることはできません。{advice}',
		longCaptureWarn:
			'このキャプチャは 1/{divisor} の再生速度で、実時間で約 {duration} かかります{passSuffix}。',
		passSuffix: '（同じ瞬間を {passes} パスにわたって処理します）',
		adviceFewerPasses:
			'パス数を減らすと早く終わりますが、サンプルは少なくなります。',
		adviceFasterPlayback:
			'再生速度を上げると早く終わりますが、サンプルは少なくなります。',
		pastLogCap:
			'このキャプチャでは {passes} パスで約 {samples} サンプルが集まると予測され、診断ログが保持できる {cap} を超えます。画像に影響はありませんが、均等さと間隔の数値はキャプチャの前半部分だけを表すことになります。',
		interpolationLossy:
			'このサイズでは、{factor}x の補間はこのパソコンで実サンプルを犠牲にしたことがあります。より低い倍率、より低い解像度、あるいは代わりにパス数を増やすことを検討してください。',
	},

	duration: {
		zero: '0秒',
		seconds: {
			other: '{count}秒',
		},
		minutes: {
			other: '{count}分',
		},
		minutesSeconds: '{minutes}分{seconds}秒',
	},

	// The iRacing configuration editor page. Setting labels/helps are addressed
	// mechanically as settings.<sectionSlug>.<key>.label|.help — the schema in
	// utilities/iracing-settings-schema.ts derives the keys, and its test fails
	// if one is missing here.
	iniEditor: {
		title: 'iRacing Configuration Editor',
		nav: {
			home: 'Screenshots',
			config: 'iRacing configuration',
		},
		tabs: {
			monitor: 'Monitor / Display',
			graphics: 'Graphics',
		},
		mode: {
			label: 'Currently editing configuration:',
			// Mode names come from iRacing's own filenames; Legacy is the bare
			// rendererDX11.ini only old-website launches still read.
			legacy: 'Legacy',
		},
		actions: {
			save: 'Save changes',
			discard: 'Discard',
			reload: 'Reload',
			browse: 'Browse…',
		},
		state: {
			dirty: {
				one: '{count} unsaved change',
				other: '{count} unsaved changes',
			},
			saved: 'Changes saved to {file}',
			simRunning:
				'iRacing is running. It keeps these settings in memory and rewrites the file when it exits, so edits made now would be lost. Close iRacing to edit.',
			stale: 'This file changed on disk since it was loaded — usually iRacing rewriting it on exit. Reload to see the current values.',
			keyMissing: 'Not present in this file',
			noModes:
				'No renderer configuration files were found in {folder}. Launch iRacing once to create them, or point the tool at your iRacing folder.',
			loadFailed: 'The configuration file could not be read.',
			discardConfirm: 'Discard {count} unsaved changes?',
		},
		folder: {
			label: 'iRacing folder',
			autoDetected: 'Auto-detected',
			reset: 'Use auto-detection',
			help: 'Where iRacing keeps its configuration files. Leave empty to detect the Documents\\iRacing folder automatically.',
		},
		errors: {
			iracingRunning:
				'Close iRacing first — it would overwrite the change when it exits.',
			staleFile:
				'The file changed on disk since it was loaded. Reload and try again.',
			validationFailed:
				'One of the values is not valid. Nothing was changed.',
			keyNotFound:
				'A setting was missing from the file, so nothing was changed. Reload and try again.',
			fileNotFound: 'The configuration file no longer exists.',
			ioError: 'The file could not be written. Nothing was changed.',
		},
		groups: {
			window: 'Window placement',
			fullscreen: 'Full screen',
			quality: 'Quality & detail',
			aa: 'Anti-aliasing & sharpening',
			post: 'Post-processing',
			perf: 'Performance',
			misc: 'Miscellaneous',
		},
		// Shared tier vocabulary for enum settings.
		levels: {
			off: 'Off',
			low: 'Low',
			medium: 'Medium',
			high: 'High',
			max: 'Max',
			ultra: 'Ultra',
		},
		nvReflex: {
			off: 'Off',
			on: 'On',
			onBoost: 'Boost',
		},
		shadowDetail: {
			fewer: 'Fewer shadows',
			maximum: 'Maximum shadows',
		},
		aaMethod: {
			none: 'None',
			msaa: 'MSAA',
			fxaa: 'FXAA',
			smaa: 'SMAA',
		},
		msaaSamples: {
			x2: '2x',
			x4: '4x',
			x8: '8x',
		},
		msaaFilter: {
			soft: 'Soft',
			neutral: 'Neutral',
			sharp: 'Sharp',
			simple: 'Simple',
		},
		dnsmFilter: {
			off: 'Off',
			simple: 'Simple',
			pcf4: 'PCF4',
			pcf4p: 'PCF4P',
			pcf8p: 'PCF8P',
			pcf16p: 'PCF16P',
		},
		dynamicShadowMaps: {
			off: 'Off',
			mainView: 'In Main View',
			mainViewMirrors: 'In Main View & Mirrors',
		},
		hideObstructions: {
			none: 'None',
			halo: 'Hide the halo',
			pillarRollcage: 'Hide A-pillars and rollcage',
			everything: 'Hide everything',
		},
		replayScope: {
			label: 'Also apply to replay graphics',
		},
		// Inline hints under a field whose pending value cannot be saved. Only
		// numeric inputs can go invalid (switches and dropdowns cannot), and
		// every bounded numeric in the schema carries both bounds.
		invalid: {
			intRange: 'Enter a whole number between {min} and {max}.',
			int: 'Enter a whole number.',
			floatRange: 'Enter a number between {min} and {max}.',
			float: 'Enter a number.',
		},
		layout: {
			title: 'Monitor layout',
			primary: 'Primary',
			windowTarget: 'iRacing window',
			estimated:
				'Estimated — Windows and iRacing number displays differently, so the highlight is matched by position.',
		},
		settings: {
			display: {
				border: { label: 'Window border' },
				windowedXPos: { label: 'Window left' },
				windowedYPos: { label: 'Window top' },
				windowedWidth: { label: 'Window width' },
				windowedHeight: { label: 'Window height' },
				windowedMaximized: { label: 'Start maximized' },
				windowedAlignment: {
					label: 'Window alignment',
					help: 'iRacing does not document this value. Leave unchanged unless you know the alignment index you want.',
				},
				fullScreen: { label: 'Full screen' },
				fullScreenWidth: { label: 'Full-screen width' },
				fullScreenHeight: { label: 'Full-screen height' },
				fullScreenDepth: {
					label: 'Full-screen color depth',
					help: 'Bits per pixel. 32 on effectively every modern system.',
				},
				RefreshRate: {
					label: 'Refresh rate',
					help: '0 uses the display’s default refresh rate.',
				},
			},
			graphics: {
				ShaderQuality: { label: 'Shader quality' },
				ShadowDetail: { label: 'Shadow detail' },
				DynamicShadowMaps: {
					label: 'Dynamic shadow maps',
					help: 'Shadow maps for cars and other moving objects. Day only.',
				},
				DNSMFilter: {
					label: 'Shadowmap filter',
					help: 'The filter used for the dynamic night shadow maps.',
				},
				CarDetail: { label: 'Car detail' },
				PitObjectDetail: { label: 'Pit object detail' },
				CrowdDetail: { label: 'Crowd detail' },
				GrandstandDetail: { label: 'Grandstand detail' },
				ObjectDetail: { label: 'Object detail' },
				FoliageDetail: { label: 'Foliage detail' },
				ParticleDetail: { label: 'Particle detail' },
				ParticlesFullRes: { label: 'Full-resolution particles' },
				MirrorDetail: { label: 'Higher detail in mirrors' },
				MaxCockpitMirrors: { label: 'Max cockpit mirrors' },
				AntiAliasMethod: { label: 'Anti-aliasing method' },
				MSAASamples: { label: 'MSAA samples' },
				MSAAUseFilter: { label: 'MSAA filter' },
				Sharpening: { label: 'Sharpening' },
				SharpeningAmount: {
					label: 'Sharpening amount',
					help: 'Strength of the sharpening filter.',
				},
				FSRSharpness: {
					label: 'FSR sharpness',
					help: 'Sharpness used when resolution scaling upscales with FSR.',
				},
				AutoExposure: {
					label: 'Auto exposure',
					help: 'Only functions while HDR rendering is enabled.',
				},
				SSAO: { label: 'Ambient occlusion (SSAO)' },
				SSRLevel: {
					label: 'Screen-space reflections',
					help: 'Low renders the reflections at a lower resolution, High at full resolution.',
				},
				SSRRainOnly: {
					label: 'Reflections only during rain',
					help: 'Limits screen-space reflections to wet track conditions — the Low Rain and High Rain options in the sim.',
				},
				HeatHaze: { label: 'Heat haze' },
				DepthOfField: { label: 'Depth of field' },
				MotionBlurStrength: { label: 'Motion blur strength' },
				Distortion: { label: 'Lens distortion' },
				EnableHDR: { label: 'HDR rendering' },
				LimitFrameRate: { label: 'Limit frame rate' },
				DesiredFPSLimit: { label: 'Frame rate limit' },
				VerticalSync: { label: 'Vertical sync' },
				NvReflexMode: { label: 'NVIDIA Reflex' },
				MaxPreRenderedFrames: {
					label: 'Max pre-rendered frames',
					help: 'How many frames the GPU may trail behind the CPU. 1 is normal; 0 disables the queue for multi-GPU setups.',
				},
				SysMemToUseMB: { label: 'System memory to use' },
				VidMemToUseMB: { label: 'Video memory to use' },
				MaxCarsToDraw: { label: 'Max cars to draw' },
				MaxCarsToDrawInMirrors: { label: 'Max cars in mirrors' },
				VirtualMirrors: { label: 'Virtual mirrors' },
				UIScale: { label: 'UI scale' },
				EnableTireMarks: { label: 'Tire marks' },
				HideCockpitObstructions: { label: 'Hide cockpit obstructions' },
				HeadlightLevel: { label: 'Headlight quality' },
			},
		},
	},
};

export default ja;
