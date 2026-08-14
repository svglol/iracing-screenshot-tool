// Traditional Chinese (Taiwan). Translated from en.ts — see that file's header before editing.
//
// NOTE ON PLURALS. Chinese has no grammatical plural, so every plural node here
// supplies only `other` — the one form Intl.PluralRules ever selects for zh-TW.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.
// So do iRacing's own menu labels (Display > Full Screen, OFF, Borderless,
// Windowed, Camera > Config > Preferences, Shot Selection, Automatic) — the sim
// shows them in English whatever language this app is in.

import type { Catalog } from './index';

const zhTW: Catalog = {
	notice: {
		danger: '問題',
		warning: '值得注意',
		info: '備註',
	},

	promo: {
		greeting: '感謝您使用 iRacing Screenshot Tool！',
		signature: '由 AR Media Solutions 開發與維護。',
	},

	changelog: {
		title: '變更記錄',
		untitledRelease: '版本',
	},

	gallery: {
		menu: {
			openExternally: '以外部程式開啟',
			openFolder: '開啟資料夾',
			copy: '複製',
			delete: '刪除',
		},
		copiedToClipboard: '已將 {name} 複製到剪貼簿',
	},

	sidebar: {
		resolution: '解析度',
		width: '寬度',
		height: '高度',
		output: '輸出：',
		cropWatermark: '裁切浮水印',
		keepAspectRatio: '維持長寬比',
		screenshot: '螢幕截圖',
		custom: '自訂',
		vramStatus: '{adapter}可用 {free}，共 {total}',
		savedSuccessfully: '已成功儲存 {name}',
		screenshotFailed: '螢幕截圖失敗：{message}',
		errorLogPrefix: '記錄檔：',
		notices: {
			exclusiveFullscreen:
				'iRacing 目前處於獨佔全螢幕模式，截圖會是一片黑。請在 iRacing 中將 Display > Full Screen 設為 OFF（Borderless 或 Windowed）以啟用擷取。',
			vramRisk:
				'{resolution} 還需要約 {needed} 的 VRAM，但目前只有 {free} 可用；iRacing 很可能會因記憶體不足而當機。',
			vramCaution:
				'{resolution} 幾乎不留 VRAM 餘裕（可用 {free}），在較吃資源的賽道與賽車組合下可能當機。',
			switchResolution: '切換為 {resolution}',
			vramStatic:
				'高解析度在 VRAM 用盡時可能導致 iRacing 當機。某些賽道與賽車組合會需要更多 VRAM。',
			reshade:
				'在 iRacing Screenshot Tool 中按下截圖按鈕後，還需要再按一次 ReShade 的截圖快速鍵。',
			crop: '「裁切浮水印」會讓最終畫面稍微放大，靠近螢幕邊緣的區域會被裁掉。',
			aspectRatio:
				'「維持長寬比」會調整截圖高度以符合您螢幕的長寬比（例如 21:9 超寬螢幕），而不是預設的 16:9。所選解析度決定寬度。',
		},
	},

	settings: {
		title: '設定',
		version: '版本 - {version}',
		changelog: '變更記錄',
		openLogsFolder: '開啟記錄檔資料夾',
		checkForUpdates: '檢查更新',
		updateCheckFailed: '檢查更新失敗：{message}',

		language: '語言',
		languageDescription:
			'整個應用程式使用的語言。首次執行時會從 Windows 偵測。',

		screenshotFolder: '截圖資料夾',
		selectFolder: '選擇資料夾',
		screenshotKeybind: '截圖快速鍵',
		editBind: '變更快速鍵',

		customFilenameFormat: '自訂檔名格式',
		customFilenameFormatDescription:
			'使用自訂樣式取代預設的（{track}-{driver}-{counter}）',
		filenameFieldsHint:
			'點選欄位即可把它們加入格式。分隔符號（-、_ 等）請直接輸入。',
		reset: '重設',
		preview: '預覽：',

		outputFormat: '輸出格式',
		formatJpeg: 'JPEG（最高品質）',
		formatPng: 'PNG（無損）',
		formatWebp: 'WebP（品質 95%）',

		disableTooltips: '關閉工具提示',
		disableTooltipsDescription: '別煩我，我知道自己在做什麼',

		cropTopLeft: '偏好從左上角裁切浮水印',
		cropTopLeftDescription:
			'只裁切右下角（3%）。關閉時，截圖會從四邊平均裁切（共 6%），得到置中的結果。',

		manualWindowRestore: '手動還原視窗',
		manualWindowRestoreDescription:
			'以自訂的位置與大小取代自動還原視窗。適合使用超寬螢幕或 Nvidia Surround 的人',
		left: '左',
		top: '上',
		width: '寬度',
		height: '高度',
		restoreNow: '立即還原',

		nativeCapture: '高保真擷取（WGC）',
		nativeCaptureDescription:
			'透過 Windows.Graphics.Capture 擷取未經次取樣的真實色彩，取代預設的管線（會對色彩做次取樣）。擷取失敗時會自動退回預設方式。',
		nativeCaptureUnavailable: '此系統無法使用，高保真擷取不能在這裡執行。',
		nativeCaptureUnverified:
			'Windows 回報支援此功能，但測試擷取沒有回傳結果。若持續失敗，擷取會自動退回預設方式。',

		reshade: 'ReShade 相容模式',
		reshadeDescription:
			'使用 ReShade 時，必須先按下 iRacing Screenshot Tool 的快速鍵或按鈕，等 iRacing 視窗改變大小後，再按 ReShade 的截圖快速鍵',
		reshadeIni: 'ReShade INI',
		selectFile: '選擇檔案',
	},

	longExposure: {
		title: '長時間曝光',
		shutter: '快門',
		playbackSpeed: '播放速度',
		playbackAuto: '自動（依目標取樣數）',
		playbackRealTime: '1x（即時）',
		targetSamples: '目標取樣數',
		advanced: '進階',
		defaultsSummary: '{count} 項預設值',

		weighting: '加權',
		weightingBox: 'Box（均勻）',
		weightingLinear: 'Linear（結尾銳利）',
		weightingEase: 'Ease（開頭較銳利、拖尾較長）',

		interpolation: '影格插補',
		interpolationOff: '關閉',
		interpolation2: '2×（插入一格）',
		interpolation4: '4×（插入三格）',
		interpolation8: '8×（插入七格）',

		passes: '重複遍數',
		passes1: '1（單遍）',
		passes2: '2×（等待時間兩倍）',
		passes4: '4×（等待時間四倍）',
		passes8: '8×（等待時間八倍）',

		bracket: '快門包圍曝光',
		highlightRecovery: '亮部細節復原（級數）',

		cancel: '取消',
		saved: '已儲存長時間曝光，共 {count} 個取樣',
		failed: '長時間曝光失敗',

		modified: {
			// Short forms for the folded summary row, which is one line with an
			// ellipsis — they must stay much shorter than the option labels above.
			weighting_linear: '線性',
			weighting_ease: 'ease',
			interpolation: '{factor}× 插補',
			passes: {
				other: '{count} 遍',
			},
			bracketed: '包圍曝光',
			recovery: '復原 {stops} 級',
		},

		progress: {
			working: '處理中…',
			seeking: '尋找中…{pass}',
			accumulating: '曝光中… 已取樣 {count} 次{pass}',
			resolving: '沖洗中…',
			restoring: '正在還原重播…',
			pass: '（第 {current} 遍，共 {total} 遍）',
		},

		notices: {
			needsNativeCapture:
				'長時間曝光需要高保真擷取（WGC），但目前是關閉的。請在「設定」中開啟以啟用長時間曝光。',
			unavailableWithReason: '長時間曝光無法在這台電腦上使用：{reason}',
			unavailable: '長時間曝光無法在這台電腦上使用。',
			interpolationCost:
				'插補會在真實影格之間憑空造出影格，讓軌跡更平滑。它每一格都要花 GPU 時間，因此請拿已儲存作品的真實取樣數，和關閉插補後拍的同一張比較；如果數字下降，代表它是拿真實取樣換來虛構的取樣。',
			passesAndInterpolation:
				'重複遍數與插補會爭奪同一份每格預算。兩者同時開啟時，每一遍擷取到的真實影格都會變少；在相同的等待時間下，關閉插補通常能拍出更好的成果。',
			passes:
				'每一遍都會重播同一個瞬間，補上其他遍漏掉的影格，因此軌跡會更平滑，而不是更亮。在快門很快、單遍只能收集到少數取樣時效果最好。',
			interpolationUnsupported:
				'影格插補需要 NVIDIA Turing 或更新的 GPU{adapter}。長時間曝光的其他部分一切正常。',
			interpolationAdapter: '（這次擷取使用的是 {adapter}）',
			reshade:
				'長時間曝光採用原生擷取，不會經過 ReShade，因此 ReShade 的效果不會出現在成果中。',
		},
	},

	help: {
		title: '說明',
		sections: '說明章節',
		tabGeneral: '一般',
		tabLongExposure: '長時間曝光',
		tabFaq: '常見問題',

		general: {
			iracingSettings: 'iRacing 設定',
			borderless: 'iRacing 必須以 Windowed Borderless 模式執行',
			vram: '拍攝 8K 以上解析度的截圖，建議至少要有 8GB VRAM',
			newerContent: '較新的賽道與賽車會需要更多 VRAM',
			shrinkUi:
				'若要使用「裁切浮水印」，請在截圖前先把介面縮到最小，按「Control+PageDown」可以縮小它；如果沒有作用，可能得在 iRacing 設定中重設介面縮放。',

			screenshotFolder: '截圖資料夾',
			screenshotFolderBody:
				'截圖預設會儲存到「C:\\Users\\user\\Pictures\\Screenshots」，可以在設定中變更',

			screenshotHotkey: '截圖快速鍵',
			screenshotHotkeyBody:
				'預設按「Control + PrintScreen」會以目前的設定拍攝截圖，可以在設定中變更。',

			issues: '問題回報',
			issuesBody: '如果遇到任何問題，請回報到',
			discord: 'Discord',

			instructions: '操作步驟',
			step1: 'iRacing <b>必須</b>以 Windowed Borderless 模式執行',
			step2: '執行 iRacing，並把攝影機調整到想要截圖的位置',
			step3: '選擇想要的解析度（先試較低的解析度，再挑戰 8K）',
			step4: '決定是否要裁切 iRacing 浮水印；若要裁切，得先用「Control + PageDown」把 iRacing 介面縮到最小',
			step5: '按下截圖按鈕，或使用快速鍵「Control + PrintScreen」拍攝截圖',
			step6: '依所選解析度而定，這可能要花上幾秒；當 iRacing 畫面恢復成原本大小時就完成了',
			step7: '截圖會儲存到「C:\\Users\\{User}\\Pictures\\Screenshots」',
		},

		longExposure: {
			whatItDoes: '這項功能做什麼',
			whatItDoesBody:
				'長時間曝光會把重播中的許多影格混合成一張影像，就像相機快門一直開著那樣：靜止的東西維持銳利，移動的東西拉出軌跡。工具會自己控制重播，擷取模擬器送出的每一格畫面，並在 GPU 上把它們相加。',

			shutter: '快門',
			shutterBody:
				'曝光在<i>重播時間</i>裡持續多久，從不到一個重播影格到十秒都有。這項設定決定軌跡的長度。較長的快門也會收集到更多影格，因此比較不需要下面各項的幫忙；最快的那幾級只涵蓋單一個重播影格，只能收集到少數幾個取樣。',

			playback: '播放速度',
			playbackBody:
				'擷取曝光時，重播會以慢動作播放，讓模擬器在每一秒重播時間內送出更多影格，混合結果也就有更多取樣。1/16 收集到的影格大約是即時播放的十六倍，實際等待的時間也是十六倍。這是這個面板裡最主要的取捨：用耐心換平滑。',
			playbackAutoBody:
				'「自動（依目標取樣數）」會依<b>目標取樣數</b>替您決定速度：工具會算出仍能達到您要求數量的最快播放速度。如果您寧可限制等待時間，請改為指定明確的速度。',

			weighting: '加權',
			weightingBody:
				'每一格擷取到的影格對結果的貢獻有多少。<b>Box</b> 讓所有影格權重相同，軌跡也就均勻。<b>Linear</b> 會朝曝光窗的結尾遞增，因此主體在結束的位置最銳利，並沿著行進路徑往回淡出。<b>Ease</b> 是同樣的概念，但開頭更銳利、拖尾更長。',

			interpolation: '影格插補',
			interpolationBody:
				'利用 GPU 的光流引擎在真實影格之間造出額外的影格，填補軌跡上的空隙。需要 NVIDIA Turing 或更新的顯示卡，在做不到的硬體上會完全隱藏。',
			interpolationCostBody:
				'這不是免費的：每一格擷取到的影格都要花 GPU 時間，而預算只有一個 iRacing 影格。如果跟不上，它就會開始漏掉<i>真實</i>影格來製造合成影格，整體反而是虧的，軌跡會變得更短、更粗糙。成本隨百萬像素乘上倍率而增加，因此在 2560×1440 下很輕鬆的設定，到了 8K 就行不通。想確認的話，開啟與關閉插補各拍同一個瞬間一次，再比較真實取樣數；作品不如預期時，應用程式事後也會提醒您。',

			passes: '重複遍數',
			passesBody:
				'重複造訪同一個瞬間，累積成一張影像。每一遍都會補上其他遍剛好漏掉的影格，所以軌跡會更平滑，而不是更亮，因為結果會依實際落在每個像素上的光量做正規化。',
			passesTradeBody:
				'重複遍數買到的東西和插補一樣，只是付的貨幣不同：花的是實際時間，而不是 GPU 時間。八遍大約要花八倍的時間，但絕不會讓您損失真實影格。因此在插補跟不上的高解析度，以及單遍只能收集到極少取樣的快速快門下，它才是正確的做法。兩者同時使用通常是最糟的組合：它們會爭奪同一份每格預算。',

			bracket: '快門包圍曝光',
			bracketBody:
				'從單次擷取中，替所選快門以及所有更快的快門級數各輸出一張影像。以 1/60 拍攝時，同時也會得到 1/125、1/250、1/500 和 1/1000，也就是同一個瞬間、軌跡逐漸變短的各種版本，讓您事後再挑喜歡的效果，而不必猜測後重拍。',
			bracketCostBody:
				'這幾乎不需要額外的時間。每一級快門都結束在同一格畫面，差別只在往回涵蓋多遠，所以更快的快門不過是那些反正都會經過的影格的尾段，它們全都由同一遍重播填滿。',
			bracketMemoryBody:
				'真正要付出的代價是記憶體。每一級快門都需要自己的全解析度累加器，因此十一級就需要一級的十一倍顯示記憶體，在 8K 下超過多數顯示卡的容量。擷取會在開始前先檢查，寧可拒絕也不讓 iRacing 當機；如果包圍曝光被拒絕，請降低解析度或選擇更快的快門（那同時也代表更短的階梯）。',
			bracketNamingBody:
				'您選擇的那一級會以平常的檔名儲存，也是出現在圖庫中的那一張；其他各級就放在它旁邊，檔名中帶有各自的快門。',

			highlights: '亮部細節復原',
			highlightsBody:
				'在影格相加之前先提升接近過曝的亮部，最後再把這個提升還原回去。iRacing 交出來的影像已經做過色調映射，因此車頭燈和白牆送到手上時是同樣的數值；把這種畫面平均起來，只在曝光中一小段時間掃過的強光就會變成一團灰影，而不是明亮的軌跡。這項功能把非線性放回真實感光元件會有的位置。以級數計算；0 表示關閉，完全不做任何改變。',

			whatItSaves: '會儲存什麼',
			whatItSavesBody:
				'尺寸、浮水印裁切和檔案格式都沿用一般截圖的相同設定：上方的「解析度」與「裁切浮水印」，以及「設定」中的輸出格式。側邊欄頂端的「輸出」那一行會清楚顯示您會得到什麼。',
			whatItSavesPngBody:
				'選擇 PNG 會寫出真正的 16 位元主檔，如果之後打算調色就很值得，另外還會附一張 8 位元預覽供圖庫使用。在高解析度下寫檔也慢得多：3300 萬像素的 16 位元 PNG 大約要十秒，同一張畫面存成 JPEG 則不到一秒。',

			troubleshooting: '如果成果看起來不對',
			troubleGhosts:
				'<b>出現一個個殘影而不是平滑的軌跡</b> — 取樣太少。請改用更慢的播放速度、更多遍數，或更低的解析度。',
			troubleShutter:
				'<b>不確定自己想要哪個快門</b> — 開啟「快門包圍曝光」，用同樣的等待時間，事後再決定。',
			troubleHighlights:
				'<b>亮部過曝或死白平板</b> — 試試 3 到 5 級的亮部細節復原。',
			troubleBlack:
				'<b>整張全黑</b> — iRacing 處於獨佔全螢幕模式。請將 Display &gt; Full Screen 設為 OFF。',
			troubleSidecar:
				'每一張作品都會把使用的確切設定、取樣數，以及取樣分布的均勻程度記錄成 .json 檔，和 app.log 一起放在記錄檔資料夾裡。系統會保留最近 20 張作品（一組包圍曝光算一張），所以您正在追問的那一張，通常在您追問時都還在。',
		},

		faq: {
			blackShot: '照片是全黑的，但裡面看得到 iRacing 介面',
			blackShotBody:
				'擷取本身是成功的：介面有畫出來，代表確實有真實影格送到工具。缺的是 3D 場景，因為 iRacing 把它算成了黑色。有幾個比較特殊的攝影機會這樣，最常遇到的是懸吊攝影機。請切換到一般的攝影機（座艙、追尾，或任何一個電視攝影機），再拍一次同樣的瞬間。',
			blackShotFullscreenBody:
				'如果影像連<i>介面一起</i>全黑，而且每個攝影機都一樣，那原因就不同了：iRacing 處於獨佔全螢幕模式，模擬器以外的任何程式都擷取不到。請將 Display &gt; Full Screen 設為 OFF。',

			cameraReset: 'iRacing 在拍照前會自己移動我的攝影機',
			cameraResetBody:
				'那是 iRacing 自己的自動選鏡功能，不是本工具。只要它開著，iRacing 就會不斷替自己挑選攝影機，並在擷取開始的那一刻切回預設構圖，所以拍到的並不是您原本設好的畫面。',
			cameraResetFixBody:
				'請到 iRacing 的攝影機工具（Ctrl+F12）中關閉它，位置在 <b>Camera &gt; Config &gt; Preferences</b>：標示為 <b>Automatic</b> 的 <b>Shot Selection</b> 開關。關閉之後，攝影機就會完全停在您擺放的位置，一般截圖和長時間曝光都一樣。',
		},
	},

	update: {
		checking: '正在檢查更新…',
		newVersion: '新版本',
		availableBusy:
			'{version} 已可使用。目前正在擷取，等擷取完成後就可以下載。',
		available: '{version} 已可使用。點選即可下載。',
		downloading: '正在下載 {version}…',
		downloadingPercent: '正在下載 {version} — {percent}%',
		downloadedBusy:
			'{version} 已準備就緒。目前正在擷取，因此會在您關閉應用程式時安裝。',
		downloaded: '{version} 已準備就緒。點選即可重新啟動並安裝。',
		failed: '檢查更新失敗：{error}',
		unknownError: '不明的錯誤',
		neverChecked: '尚未檢查過更新（您目前使用 v{version}）。',
		upToDate: '您使用的是最新版本（v{version}）。',

		alreadyDownloading: '更新已經在下載中了。',
		alreadyDownloaded: '更新已經下載完成了。',
		nothingToDownload: '沒有可以下載的更新。',
		captureInProgress: '目前正在擷取，請等它完成後再試一次。',
		nothingToInstall: '沒有準備好可以安裝的更新。',
		captureInProgressInstall:
			'目前正在擷取。更新會在您關閉應用程式時自動安裝。',
		devBuildOnly: '只有已安裝的版本才會檢查更新。',

		installTitle: '安裝更新',
		installMessage: '要安裝 {version} 嗎？',
		installFallbackVersion: '這個更新',
		installDetail:
			'安裝更新後，應用程式會關閉並重新開啟。如果您選擇「稍後」，更新會在您下次關閉應用程式時自動安裝。',
		installConfirm: '重新啟動並安裝',
		installLater: '稍後',
	},

	filenameFields: {
		categories: {
			Track: '賽道',
			Driver: '車手',
			Session: '賽段',
			Meta: '中繼資料',
		},
		track: '賽道',
		trackFull: '賽道全名',
		trackCity: '城市',
		trackCountry: '國家',
		trackType: '賽道類型',
		driver: '車手',
		driverAbbrev: '車手縮寫',
		driverInitials: '姓名縮寫',
		team: '車隊',
		carNumber: '車號',
		car: '賽車',
		carFull: '賽車全名',
		carClass: '賽車組別',
		iRating: 'iRating',
		sessionType: '賽段類型',
		sessionName: '賽段名稱',
		lap: '圈數',
		date: '日期',
		time: '時間',
		datetime: '日期＋時間',
		counter: '流水號',
	},

	iracingConfig: {
		projections:
			'請在 iRacing 中關閉「Render Scene Using 3 Projections」（Display > Monitor 分頁），以避免截圖出現垂直條紋',
	},

	graphicsProfiles: {
		title: '顯示設定檔',
		description:
			'儲存多組 iRacing 顯示設定並在它們之間切換：比賽時用三螢幕，截圖時用單螢幕。',
		iracingRunning:
			'請先關閉 iRacing 再切換。它結束時會把自己的顯示設定重新寫回檔案，那會把這次變更蓋掉。',
		activeHeading: '目前的設定',
		active: {
			clean: '與您的 {name} 設定檔相符。',
			modified: {
				other: '以 {name} 為基礎，之後變更了 {count} 項設定。',
			},
			modifiedUnknownCount: '以 {name} 為基礎，之後有過變更。',
			unknown: '與任何已儲存的設定檔都不相符。',
			missing: '找不到 iRacing 的顯示設定。',
		},
		badge: {
			active: '使用中',
			modified: '已修改',
		},
		empty: {
			title: '尚未儲存任何設定檔。',
			body: '把目前的 iRacing 設定儲存成設定檔，或匯入現有的 .ini 檔案。',
		},
		invalidProfile: '不是顯示設定',
		warnings: {
			autoCfgIncomplete: '會被 iRacing 重設',
		},
		actions: {
			apply: '套用',
			overwrite: '以目前設定更新',
			rename: '重新命名',
			export: '匯出',
			delete: '刪除',
			save: '儲存',
			cancel: '取消',
			saveCurrent: '將目前設定另存為…',
			import: '匯入…',
			openFolder: '開啟資料夾',
		},
		prompt: {
			namePlaceholder: '設定檔名稱',
			deleteConfirm: '要刪除 {name} 嗎？',
		},
		feedback: {
			applied: '已套用 {name}。請啟動 iRacing 讓它生效。',
			saved: '已儲存為 {name}。',
			overwritten: '已用目前的設定更新 {name}。',
			renamed: '已重新命名為 {name}。',
			deleted: '已刪除 {name}。',
			imported: '已匯入為 {name}。',
			exported: '已匯出 {name}。',
		},
		errors: {
			empty: '請輸入設定檔的名稱。',
			illegalCharacters:
				'設定檔名稱不能包含下列任一字元：< > : " / \\ | ? *',
			reservedName: '這個名稱是 Windows 保留的，請換一個。',
			trailingDotOrSpace: '設定檔名稱的結尾不能是句點或空格。',
			tooLong: '這個名稱太長了。',
			duplicate: '已經有同名的設定檔了。',
			profileNotFound: '已經找不到那個設定檔了。',
			profileExists: '已經有同名的設定檔了。',
			noActiveConfig: '找不到可以儲存的 iRacing 顯示設定。',
			invalidIni: '這個檔案不是 iRacing 的顯示設定，因此沒有使用它。',
			iracingRunning: '請先關閉 iRacing，它結束時會覆蓋這次的變更。',
			ioError: '無法寫入檔案，沒有變更任何東西。',
		},
	},

	wgc: {
		cursorCaveat:
			'在這個版本的 Windows 上，滑鼠游標可能會出現在擷取結果中。Windows 10 2004 版才加入隱藏游標的控制項。',
		addonUnavailable: '無法在這個系統上載入高保真擷取的元件。',
		osUnsupported:
			'Windows.Graphics.Capture 在這個版本的 Windows 上無法使用，它需要 Windows 10 1903 版或更新的版本。',
		// A `reason`, not a sentence — it is shown as the tail of「長時間曝光無法
		// 在這台電腦上使用：…」, so it must not end with a full stop.
		nativeCaptureOff: '高保真擷取（WGC）已關閉',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing 處於獨佔全螢幕模式，因此截圖會是全黑的。請在 iRacing 中將 Display > Full Screen 設為 OFF（使用 Borderless 或 Windowed）後再試一次。',
		exclusiveFullscreenUnattributed:
			'有應用程式正在獨佔全螢幕模式下執行，這會讓擷取結果全黑。如果 iRacing 處於全螢幕模式，請將 Display > Full Screen 設為 OFF（使用 Borderless 或 Windowed）後再試一次。',
		unknownError: '不明的截圖錯誤',
		outputTooSmall: '擷取結果太小（{width}x{height}）',
		blackFrame:
			'擷取到的影格是全黑的，擷取來源可能失敗了（在某些 Windows 環境下，GPU 加速的內容會擷取失敗）',
		noSource: '找不到視窗 {windowId} 的桌面擷取來源',
		metadataTimeout: '等待擷取視訊中繼資料逾時',
		noVideoFrame: '擷取串流沒有產生任何視訊影格',
		dimensionTimeout:
			'等待視窗尺寸 {width}x{height} 逾時；將以 {actualWidth}x{actualHeight} 繼續',
	},

	longExposureCapture: {
		busy: '已經有一項擷取正在進行中。',
		needsNativeCapture:
			'長時間曝光需要高保真擷取（WGC）。請在「設定」中開啟後才能使用。',
		unavailable: '長時間曝光無法在這台電腦上使用。',
		noTelemetry:
			'長時間曝光需要來自 iRacing 的重播遙測資料。請確認模擬器正在執行，而且位於某個賽段中。',
		windowNotFound: '找不到 iRacing 視窗。',
		cancelled: '已取消擷取。',
		seekTimeout: '重播沒能及時到達第 {frame} 格，它可能還在載入。',
		noPasses: '一次擷取至少要跑一遍。',
		playbackStalled: '重播沒有開始播放。請確認 iRacing 沒有被其他工具暫停。',
		exposureTimeout: '曝光沒能在 {seconds} 秒內到達第 {frame} 格。',
		endedEarly: '曝光在到達所選的瞬間之前就結束了。',
		noFramesPresented: 'iRacing 沒有送出任何可供擷取的影格。',
		subFrameNoSamples:
			'這個快門比一個重播影格還短，而 iRacing 在這段時間內沒有算出任何影格。請試著放慢播放速度，或改用下一個較慢的快門。',
		noSamples: '沒有累積到任何影格。iRacing 可能在曝光期間停止算圖了。',
		blankCapture:
			'擷取到的每一格都是全黑的，因此沒有影像可以儲存。請確認 iRacing 處於視窗或無邊框模式，而不是獨佔全螢幕，並確認在這個解析度下還有剩餘的顯示記憶體；降低擷取解析度是最快能試的做法。',
		frozenCapture:
			'iRacing 在曝光期間送出了 {samples} 格畫面，但每一格都完全相同，所以這張是靜態照片而不是長時間曝光。重播進行時，iRacing 沒有算出任何新畫面。',
		withNativeError: '{reason}（{error}）',
		resolveFailed: 'GPU 沒有回傳影像。',
		bracketShortfall:
			'包圍曝光要求 {asked} 級，但只回傳了 {returned} 級；其餘的解算失敗，或是這個版本的擷取元件比包圍曝光功能還舊。',
	},

	validation: {
		windowBeforeStart:
			'曝光需要所選瞬間之前的 {frames} 格重播畫面，但該瞬間距離重播開頭只有 {anchor} 格。請挑較晚的瞬間，或較快的快門。',
		pastEnd: '所選的瞬間超過了重播的結尾。',
		sessionChanged:
			'自從設定這張作品之後，重播已經換到了不同的賽段。請重新選擇瞬間。',
		singleSampleMultiPass:
			'這個快門短到每一遍大約只有一格畫面落在其中，因此 {passes} 遍大約只能收集到 {passes} 個取樣。放慢播放速度或改用較慢的快門，能換到的取樣多得多。',
		singleSample:
			'這個快門短到只會有一格畫面落在其中，因此結果不會有動態模糊。放慢播放速度或改用較慢的快門才能換到取樣。',
		bracketVsInterpolation:
			'快門包圍曝光和 {factor}x 影格插補不能同時執行，因此這張會在不使用插補的情況下拍攝。如果中間影格對您來說比多出來的快門級數更重要，請關閉包圍曝光。',
		passesVsInterpolation:
			'多遍與 {factor}x 插補同時開啟了。它們會互相競爭：插補讓每一遍慢到足以損失真實影格，因此同樣的等待時間換到的真實取樣，比單用多遍還少。關閉插補通常能拍出更好的成果。',
		shortOfTarget:
			'即使在 1/{divisor} 的速度下，這次曝光也只能達到約 {samples} 個取樣，少於要求的 {target}。請使用較長的快門以取得更多取樣。',
		longCaptureEscalate:
			'這次擷取會以 1/{divisor} 的速度播放重播，耗時約 {duration} 的實際時間{passSuffix}，而且一旦開始就無法加快。{advice}',
		longCaptureWarn:
			'這次擷取以 1/{divisor} 的播放速度進行，約需 {duration} 的實際時間{passSuffix}。',
		passSuffix: '，分成 {passes} 遍掃過同一個瞬間',
		adviceFewerPasses: '減少遍數可以更快結束，但取樣也較少。',
		adviceFasterPlayback: '提高播放速度可以更快結束，但取樣也較少。',
		pastLogCap:
			'預估這次擷取會在 {passes} 遍中收集到約 {samples} 個取樣，超過診斷記錄檔能容納的 {cap}。影像不受影響，只是均勻度與間隔的數據只會描述這次擷取的前面一段。',
		interpolationLossy:
			'在這個尺寸下，{factor}x 插補先前曾讓這台電腦損失真實取樣。建議改用較低的倍率、較低的解析度，或改為增加遍數。',
	},

	duration: {
		zero: '0 秒',
		seconds: {
			other: '{count} 秒',
		},
		minutes: {
			other: '{count} 分鐘',
		},
		minutesSeconds: '{minutes} 分 {seconds} 秒',
	},
};

export default zhTW;
