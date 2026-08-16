// Turkish. Translated from en.ts — see that file's header before editing.
//
// NOTE ON PLURALS. Turkish's CLDR plural rule only distinguishes `one` (n=1)
// from `other` (everything else), and Turkish nouns do not inflect for number
// after a numeral ("1 geçiş", "4 geçiş"). So `one` and `other` are frequently
// identical strings, differing only in the interpolated {count} — that is
// expected and correct Turkish, not a copy-paste mistake.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats
// (PNG, JPEG, WebP). Literal iRacing UI labels and keyboard shortcuts the user
// must find in iRacing's own English interface — e.g. Display > Full Screen,
// OFF, Borderless, Windowed, Camera > Config > Preferences, Shot Selection,
// Automatic, Render Scene Using 3 Projections, Control+PageDown, Ctrl+F12 —
// stay in English inside the translated sentence, matching the convention in
// de.ts/es.ts. "Ctrl"/"Control" is likewise never localized.

import type { Catalog } from './index';

const tr: Catalog = {
	notice: {
		danger: 'Sorunlar',
		warning: 'Bilinmesi faydalı',
		info: 'Notlar',
	},

	promo: {
		greeting: "iRacing Screenshot Tool'u kullandığınız için teşekkürler!",
		signature: 'AR Media Solutions tarafından geliştirilir ve desteklenir.',
	},

	changelog: {
		title: 'Sürüm Notları',
		untitledRelease: 'Sürüm',
	},

	gallery: {
		menu: {
			openExternally: 'Harici Uygulamada Aç',
			openFolder: 'Klasörü Aç',
			copy: 'Kopyala',
			delete: 'Sil',
		},
		copiedToClipboard: '{name} panoya kopyalandı',
	},

	sidebar: {
		resolution: 'Çözünürlük',
		width: 'Genişlik',
		height: 'Yükseklik',
		output: 'Çıktı:',
		cropWatermark: 'Filigranı Kırp',
		keepAspectRatio: 'En-Boy Oranını Koru',
		screenshot: 'Ekran Görüntüsü',
		custom: 'Özel',
		vramStatus: '{adapter}{total} üzerinden {free} boş',
		savedSuccessfully: '{name} başarıyla kaydedildi',
		screenshotFailed: 'Ekran görüntüsü alınamadı: {message}',
		errorLogPrefix: 'Günlük: ',
		notices: {
			exclusiveFullscreen:
				"iRacing özel tam ekran modunda — ekran görüntüleri siyah çıkacak. iRacing'de Display > Full Screen ayarını OFF (Borderless veya Windowed) yaparak yakalamayı etkinleştirin.",
			vramRisk:
				'{resolution} yaklaşık {needed} daha fazla VRAM gerektiriyor ama sadece {free} boş — iRacing büyük olasılıkla bellek yetersizliğinden çökecek.',
			vramCaution:
				'{resolution} çok az VRAM payı bırakıyor ({free} boş) ve ağır pist/araç kombinasyonlarında çökebilir.',
			switchResolution: '{resolution} çözünürlüğüne geç',
			vramStatic:
				"VRAM yetersiz kalırsa yüksek çözünürlükler iRacing'in çökmesine yol açabilir. Bazı pist/araç kombinasyonları daha fazla VRAM gerektirir.",
			reshade:
				"iRacing Screenshot Tool'daki ekran görüntüsü düğmesine bastıktan sonra, ReShade için ekran görüntüsü kısayolunuza da basmanız gerekecek.",
			crop: 'Filigranı Kırp, son görüntüyü hafifçe yakınlaştırır. Ekranın kenarlarına yakın bölgeler kırpılır.',
			aspectRatio:
				'En-Boy Oranını Koru, ekran görüntüsünün yüksekliğini varsayılan 16:9 yerine monitörünüzün en-boy oranına (örneğin 21:9 ultra geniş) göre ayarlar. Seçilen çözünürlük genişliği belirler.',
		},
	},

	settings: {
		title: 'Ayarlar',
		version: 'Sürüm - {version}',
		changelog: 'Sürüm Notları',
		openLogsFolder: 'Günlük Klasörünü Aç',
		checkForUpdates: 'Güncellemeleri Denetle',
		updateCheckFailed: 'Güncelleme denetimi başarısız oldu: {message}',

		language: 'Dil',
		languageDescription:
			"Uygulama genelinde kullanılan dil. Uygulama ilk çalıştırıldığında Windows'tan algılanır.",

		screenshotFolder: 'Ekran Görüntüsü Klasörü',
		selectFolder: 'Klasör Seç',
		screenshotKeybind: 'Ekran Görüntüsü Kısayolu',
		editBind: 'Kısayolu Düzenle',

		customFilenameFormat: 'Özel Dosya Adı Biçimi',
		customFilenameFormatDescription:
			'Varsayılan ({track}-{driver}-{counter}) yerine özel bir kalıp kullan',
		filenameFieldsHint:
			'Alanları biçime eklemek için üzerlerine tıklayın. Ayırıcıları (-, _, vb.) doğrudan yazın.',
		reset: 'Sıfırla',
		preview: 'Önizleme:',

		outputFormat: 'Çıktı Biçimi',
		formatJpeg: 'JPEG (maksimum kalite)',
		formatPng: 'PNG (kayıpsız)',
		formatWebp: 'WebP (%95 kalite)',

		disableTooltips: 'İpuçlarını Kapat',
		disableTooltipsDescription: 'Beni rahat bırakın, ne yaptığımı biliyorum',

		cropTopLeft: 'Filigran kırpmasını sol üstten tercih et',
		cropTopLeftDescription:
			'Yalnızca sağ alt köşeyi (%3) kırpar. Kapalıyken, ortalanmış bir sonuç için ekran görüntüsü tüm kenarlardan eşit olarak (toplam %6) kırpılır.',

		manualWindowRestore: 'Manuel Pencere Geri Yükleme',
		manualWindowRestoreDescription:
			'Otomatik pencere geri yüklemenin yerine özel bir konum ve boyut kullanır. Ultra geniş ekran veya Nvidia Surround kullananlar için faydalıdır',
		left: 'Sol',
		top: 'Üst',
		width: 'Genişlik',
		height: 'Yükseklik',
		restoreNow: 'Şimdi Geri Yükle',

		nativeCapture: 'Yüksek Sadakatli Yakalama (WGC)',
		nativeCaptureDescription:
			'Renkleri alt örneklemeye tabi tutan varsayılan işlem hattı yerine, Windows.Graphics.Capture üzerinden gerçek ve alt örneklemesiz rengi yakalar. Bir yakalama başarısız olursa otomatik olarak eski yönteme döner.',
		nativeCaptureUnavailable:
			'Bu sistemde kullanılamıyor — yüksek sadakatli yakalama burada çalışamaz.',
		nativeCaptureUnverified:
			'Windows bunun desteklendiğini bildiriyor, ancak bir test yakalaması sonuç vermedi. Başarısız olmaya devam ederse yakalamalar otomatik olarak eski yönteme döner.',

		reshade: 'ReShade Uyumluluk Modu',
		reshadeDescription:
			'ReShade kullanırken önce iRacing Screenshot Tool kısayolunuzu kullanmanız ya da düğmeye basmanız, ardından iRacing penceresi yeniden boyutlandıktan sonra ReShade ekran görüntüsü kısayolunuzu kullanmanız gerekir',
		reshadeIni: 'ReShade INI',
		selectFile: 'Dosya Seç',
	},

	longExposure: {
		title: 'Uzun Pozlama',
		shutter: 'Enstantane',
		playbackSpeed: 'Oynatma hızı',
		playbackAuto: 'Otomatik (hedef örnek sayısından)',
		playbackRealTime: '1x (gerçek zamanlı)',
		targetSamples: 'Hedef örnek sayısı',
		advanced: 'Gelişmiş',
		defaultsSummary: '{count} varsayılan ayar',

		weighting: 'Ağırlıklandırma',
		weightingBox: 'Box (eşit)',
		weightingLinear: 'Doğrusal (sonda keskin)',
		weightingEase: 'Ease (başta daha keskin, uzun kuyruk)',

		interpolation: 'Kare ara değerleme',
		interpolationOff: 'Kapalı',
		interpolation2: '2× (bir ara kare)',
		interpolation4: '4× (üç ara kare)',
		interpolation8: '8× (yedi ara kare)',

		passes: 'Geçişler',
		passes1: '1 (tek geçiş)',
		passes2: '2× — iki kat bekleme',
		passes4: '4× — dört kat bekleme',
		passes8: '8× — sekiz kat bekleme',

		bracket: 'Enstantane Bracketleme',
		highlightRecovery: 'Vurgu Kurtarma (stop)',

		cancel: 'İptal',
		saved: 'Uzun pozlama kaydedildi — {count} örnek',
		failed: 'Uzun pozlama başarısız oldu',

		modified: {
			weighting_linear: 'doğrusal',
			weighting_ease: 'ease',
			interpolation: '{factor}× ara değerleme',
			passes: {
				one: '{count} geçiş',
				other: '{count} geçiş',
			},
			bracketed: 'bracketleme',
			recovery: '{stops} stop kurtarma',
		},

		progress: {
			working: 'Çalışılıyor…',
			seeking: 'Aranıyor…{pass}',
			accumulating: 'Pozlanıyor… {count} örnek{pass}',
			resolving: 'Banyo ediliyor…',
			restoring: 'Replay geri yükleniyor…',
			pass: ' (geçiş {current}/{total})',
		},

		notices: {
			needsNativeCapture:
				'Uzun pozlama, şu anda kapalı olan Yüksek Sadakatli Yakalamayı (WGC) gerektirir. Uzun pozlamayı kullanabilmek için bunu Ayarlardan açın.',
			unavailableWithReason:
				'Uzun pozlama bu bilgisayarda kullanılamıyor: {reason}',
			unavailable: 'Uzun pozlama bu bilgisayarda kullanılamıyor.',
			interpolationCost:
				'Ara değerleme, akışı yumuşatmak için gerçek kareler arasına yeni kareler uydurur. Kare başına GPU süresi harcar, bu yüzden kaydedilen görüntünün gerçek örnek sayısını, aynı görüntünün ara değerleme kapalıyken çekilmiş hâliyle karşılaştırın — bu sayı düşüyorsa, uydurma örnekleri gerçek örnekler pahasına satın alıyor demektir.',
			passesAndInterpolation:
				'Geçişler ve ara değerleme aynı kare başı bütçe için yarışır. İkisi de açıkken, her geçiş daha az gerçek kare yakalar — ara değerlemeyi kapatmak genellikle aynı bekleme süresinde daha iyi bir görüntü verir.',
			passes:
				'Her geçiş aynı anı yeniden oynatır ve diğerlerinin kaçırdığı kareleri yakalar, böylece akış daha parlak değil daha pürüzsüz olur. En iyi sonucu, tek bir geçişin yalnızca bir avuç örnek topladığı hızlı enstantanelerde verir.',
			interpolationUnsupported:
				'Kare ara değerleme, NVIDIA Turing veya daha yeni bir GPU gerektirir{adapter}. Uzun pozlamanın geri kalan her şeyi normal şekilde çalışır.',
			interpolationAdapter: ' (bu yakalama {adapter} üzerinde çalışıyor)',
			reshade:
				'Uzun pozlama görüntüyü doğrudan yakalar ve ReShade kullanmaz, bu yüzden ReShade efektleri sonuçta görünmez.',
		},
	},

	help: {
		title: 'Yardım',
		sections: 'Yardım bölümleri',
		tabGeneral: 'Genel',
		tabLongExposure: 'Uzun Pozlama',
		tabFaq: 'SSS',

		general: {
			iracingSettings: 'iRacing Ayarları',
			borderless: 'iRacing, Windowed Borderless modunda çalışıyor olmalı',
			vram: '8K veya üzeri çözünürlükte ekran görüntüleri için en az 8 GB VRAM önerilir',
			newerContent:
				'Daha yeni pistler ve araçlar daha fazla VRAM gerektirir',
			shrinkUi:
				'Filigranı Kırp seçeneğini kullanıyorsanız, ekran görüntüsü almadan önce arayüzü gidebileceği en küçük boyuta küçültün; «Control+PageDown» bunu küçültür. İşe yaramazsa iRacing ayarlarından arayüz yakınlaştırmasını sıfırlamanız gerekebilir',

			screenshotFolder: 'Ekran Görüntüsü Klasörü',
			screenshotFolderBody:
				'Ekran görüntüleri varsayılan olarak «C:\\Users\\user\\Pictures\\Screenshots» konumuna kaydedilir; bu, ayarlardan değiştirilebilir',

			screenshotHotkey: 'Ekran Görüntüsü Kısayol Tuşu',
			screenshotHotkeyBody:
				'Varsayılan olarak «Control + PrintScreen» geçerli ayarlarla bir ekran görüntüsü alır; bu, ayarlardan değiştirilebilir.',

			issues: 'Sorunlar',
			issuesBody:
				'Herhangi bir sorunla karşılaşırsanız lütfen bunu şuraya bildirin:',
			discord: 'Discord',

			instructions: 'Talimatlar',
			step1: 'iRacing, Windowed Borderless modunda çalışıyor <b>olmalıdır</b>',
			step2: "iRacing'i çalıştırın ve kamerayı ekran görüntüsünü almak istediğiniz konuma ayarlayın",
			step3: "İstediğiniz çözünürlüğü seçin (8K'ya geçmeden önce daha düşük çözünürlükleri deneyin)",
			step4: 'iRacing filigranını kırpmak isteyip istemediğinizi seçin; kırpmak istiyorsanız önce iRacing arayüzünü «Control + PageDown» ile en küçük boyuta getirmeniz gerekir',
			step5: 'Ekran görüntülerini almak için ekran görüntüsü düğmesine basın veya «Control + PrintScreen» kısayolunu kullanın',
			step6: 'Seçilen çözünürlüğe bağlı olarak bu birkaç saniye sürebilir; iRacing ekranı normal boyutuna döndüğünde işlem tamamlanmış demektir',
			step7: 'Ekran görüntünüz «C:\\Users\\{User}\\Pictures\\Screenshots» konumuna kaydedilecek',
		},

		longExposure: {
			whatItDoes: 'Ne işe yarar',
			whatItDoesBody:
				"Uzun pozlama, bir replay'in birçok karesini tek bir görüntüde birleştirir — tıpkı bir kamera enstantanesini açık bırakmak gibi: sabit duran şeyler keskin kalır, hareket edenler iz bırakır. Uygulama replay'i kendisi yönetir, simülatörün sunduğu her kareyi yakalar ve bunları GPU üzerinde toplar.",

			shutter: 'Enstantane',
			shutterBody:
				'Pozlamanın <i>replay zamanında</i> ne kadar sürdüğü — bir replay karesinin bir kesrinden on saniyeye kadar. İzlerin uzunluğunu belirleyen ayar budur. Uzun enstantaneler daha fazla kare de toplar, bu yüzden aşağıdaki ayarların yardımına daha az ihtiyaç duyarlar; en hızlı değerler tek bir replay karesine sığar ve yalnızca bir avuç örnek toplar.',

			playback: 'Oynatma hızı',
			playbackBody:
				'Pozlama yakalanırken replay ağır çekimde oynatılır, böylece simülatör replay zamanının saniyesi başına daha fazla kare sunar ve karışıma daha fazla örnek girer. 1/16, gerçek zamana göre yaklaşık on altı kat daha fazla kare toplar — ve gerçek zamanda on altı kat daha uzun sürer. Paneldeki asıl denge budur: pürüzsüzlük karşılığında sabır.',
			playbackAutoBody:
				'«Otomatik (hedef örnek sayısından)», hızı sizin için <b>Hedef örnek sayısı</b>na göre seçer: uygulama, istediğiniz sayıya yine de ulaşan en hızlı oynatmayı bulur. Bekleme süresini sınırlamayı tercih ediyorsanız bunun yerine belirli bir hız ayarlayın.',

			weighting: 'Ağırlıklandırma',
			weightingBody:
				'Yakalanan her karenin sonuca ne kadar katkıda bulunduğu. <b>Box</b> hepsini eşit ağırlıklandırır ve düzgün bir iz verir. <b>Doğrusal</b>, pencerenin sonuna doğru artar, böylece konu hareketini bitirdiği noktada en keskin olur ve yolu boyunca solar. <b>Ease</b> aynı fikrin daha keskin bir baş ve daha uzun bir kuyruğa sahip hâlidir.',

			interpolation: 'Kare ara değerleme',
			interpolationBody:
				"GPU'nun optik akış motorunu kullanarak gerçek kareler arasına ek kareler uydurur ve izdeki boşlukları doldurur. NVIDIA Turing veya daha yeni bir kart gerektirir ve bunu yapamayan donanımlarda tamamen gizlenir.",
			interpolationCostBody:
				"Bu bedava değildir: yakalanan her karede GPU süresi harcar ve bütçe tam olarak bir iRacing karesidir. Yetişemezse, sentetik kareler üretmek için <i>gerçek</i> kareleri kaçırmaya başlar; bu da net bir kayıptır — iz daha kısa ve daha kaba çıkar. Maliyet, megapiksel sayısı ile çarpanın çarpımına göre ölçeklenir, bu yüzden 2560×1440'ta rahat olan şey 8K'da uygulanabilir değildir. Bunu kontrol etmek için aynı anı açık ve kapalıyken iki kez çekin ve gerçek örnek sayılarını karşılaştırın; bir çekim yetersiz kalırsa uygulama da sonradan sizi uyarır.",

			passes: 'Geçişler',
			passesBody:
				'Aynı ana birkaç kez uğrayarak tek bir görüntüde biriktirir. Her geçiş, diğerlerinin kaçırdığı kareleri yakalar, bu yüzden iz daha parlak değil — daha pürüzsüz olur, çünkü sonuç her pikselin üzerine gerçekten düşen ışık miktarına göre normalize edilir.',
			passesTradeBody:
				'Geçişler, ara değerlemenin satın aldığı şeyi farklı bir para birimiyle satın alır: GPU süresi yerine gerçek zaman. Sekiz geçiş yaklaşık sekiz kat daha uzun sürer, ama size asla gerçek karelere mal olmaz. Bu da onları, ara değerlemenin yetişemediği yüksek çözünürlüklerde ve tek bir geçişin çok az örnek topladığı hızlı enstantanelerde doğru yöntem yapar. İkisini birden kullanmak genellikle bu değiş tokuşun en kötü hâlidir — aynı kare başı bütçe için yarışırlar.',

			bracket: 'Enstantane Bracketleme',
			bracketBody:
				"Tek bir yakalamadan, seçtiğiniz enstantaneyle aynı veya ondan daha hızlı her enstantane kademesi için bir görüntü üretir. 1/60'lık bir çekim size ayrıca 1/125, 1/250, 1/500 ve 1/1000 de verir — giderek kısalan izlerle aynı an — böylece görünümü tahmin edip yeniden çekmek yerine sonradan seçebilirsiniz.",
			bracketCostBody:
				"Neredeyse hiç ekstra zaman almaz. Her kademe aynı karede biter ve yalnızca ne kadar geriye gittiğiyle farklılaşır, bu yüzden daha hızlı bir enstantane, zaten geçmekte olan karelerin kuyruğundan ibarettir — hepsi replay'in tek bir geçişinden doldurulur.",
			bracketMemoryBody:
				"Asıl maliyeti bellektir. Her kademe kendi tam çözünürlüklü toplayıcısına ihtiyaç duyar, bu yüzden on bir kademe tek bir kademenin on bir katı video belleği gerektirir; bu da 8K'da çoğu kartın sahip olduğundan fazladır. Yakalama işlemi bunu başlamadan önce kontrol eder ve iRacing'i çökertmek yerine reddeder; bu yüzden bir bracket reddedilirse çözünürlüğü düşürün veya daha hızlı bir enstantane seçin — ki bu da zaten daha kısa bir merdiven demektir.",
			bracketNamingBody:
				'Seçtiğiniz kademe her zamanki adla kaydedilir ve galeride görünen odur; diğerleri, dosya adlarında kendi enstantaneleriyle birlikte onun yanında durur.',

			highlights: 'Vurgu Kurtarma',
			highlightsBody:
				'Kareler toplanmadan önce kırpılmaya yakın vurguları güçlendirir, sonda ise bu güçlendirmeyi geri alır. iRacing, zaten ton eşlemesi yapılmış bir görüntü verir, bu yüzden bir far ile beyaz bir duvar aynı değerle gelir; bunu ortalamak, pozlamanın bir bölümünde süpürülen parlak bir ışığı parlak bir iz yerine gri bir leke gibi gösterir. Bu, doğrusal olmayan yapıyı gerçek bir sensörde olduğu yere geri koyar. Stop cinsinden ölçülür; 0 kapalıdır ve hiçbir şeyi değiştirmez.',

			whatItSaves: 'Neyi kaydeder',
			whatItSavesBody:
				'Boyut, filigran kırpma ve dosya biçimi, normal bir ekran görüntüsünün kullandığı aynı denetimleri izler — yukarıdaki Çözünürlük ve Filigranı Kırp ayarları ile Ayarlardaki çıktı biçimi. Kenar çubuğunun üstündeki Çıktı satırı tam olarak ne alacağınızı gösterir.',
			whatItSavesPngBody:
				'PNG seçmek, gerçek bir 16 bit ana dosya yazar; bu, çekimi sonradan renk derecelendirmeyi düşünüyorsanız değerlidir, ayrıca galeri için 8 bit bir önizleme de yazılır. Yüksek çözünürlüklerde yazması da çok daha yavaştır — 33 megapikselli 16 bit bir PNG yaklaşık on saniye sürerken aynı kare JPEG olarak bir saniyenin altında sürer.',

			troubleshooting: 'Sonuç yanlış görünüyorsa',
			troubleGhosts:
				'<b>Pürüzsüz bir iz yerine ayrık hayaletler</b> — çok az örnek. Daha yavaş bir oynatma hızı, daha fazla geçiş veya daha düşük bir çözünürlük kullanın.',
			troubleShutter:
				'<b>Hangi enstantaneyi istediğinizden emin değilseniz</b> — Enstantane Bracketlemeyi açın ve aynı bekleme süresi için sonradan karar verin.',
			troubleHighlights:
				'<b>Yanmış veya düz vurgular</b> — 3 ila 5 stop vurgu kurtarma deneyin.',
			troubleBlack:
				'<b>Siyah bir görüntü</b> — iRacing özel tam ekran modunda. Display &gt; Full Screen ayarını OFF yapın.',
			troubleSidecar:
				"Her çekim, kullandığı tam ayarları, örnek sayısını ve örneklerin ne kadar düzenli dağıldığını, günlük klasöründe app.log'un yanında bir .json dosyası olarak kaydeder. Son 20 çekim saklanır — bir bracket tek çekim sayılır — bu yüzden hakkında soru sorduğunuz çekim, siz sorarken hâlâ oradadır.",
		},

		faq: {
			blackShot: 'Çekim siyah, ama iRacing arayüzü içinde görünüyor',
			blackShotBody:
				'Yakalamanın kendisi çalıştı: kaplama çizildi, yani uygulamaya gerçek bir kare ulaştı. Eksik olan 3D sahne, çünkü iRacing onu siyah render etti. Daha alışılmadık kameralardan birkaçı bunu yapar — insanların en çok karşılaştığı süspansiyon kamerasıdır. Sıradan bir kameraya (kokpit, takip veya TV kameralarından biri) geçin ve aynı anı yeniden çekin.',
			blackShotFullscreenBody:
				'Görüntü, arayüz <i>dahil</i> siyahsa ve her kamera aynı şekilde davranıyorsa, neden farklıdır: iRacing özel tam ekran modunda, ki bunu simülatör dışındaki hiçbir şey yakalayamaz. Display &gt; Full Screen ayarını OFF yapın.',

			cameraReset: 'iRacing çekimi almadan önce kameramı hareket ettiriyor',
			cameraResetBody:
				"Bu, bu uygulamanın değil, iRacing'in kendi otomatik çekim seçimidir. Açıkken iRacing kameraları kendi başına seçmeye devam eder ve yakalama başladığı anda varsayılan bir kadraja geri döner, bu yüzden elde ettiğiniz, kurduğunuz çekim olmaz.",
			cameraResetFixBody:
				"Bunu iRacing'in kamera aracında (Ctrl+F12), <b>Camera &gt; Config &gt; Preferences</b> altında kapatın: <b>Shot Selection</b> anahtarı (<b>Automatic</b> etiketli). Kapalıyken kamera tam olarak koyduğunuz yerde kalır — hem normal ekran görüntüleri hem de uzun pozlamalar için.",
		},
	},

	update: {
		checking: 'Güncellemeler denetleniyor…',
		newVersion: 'Yeni bir sürüm',
		availableBusy:
			'{version} kullanılabilir. Bir yakalama sürüyor — bittiğinde indirebilirsiniz.',
		available: '{version} kullanılabilir. İndirmek için tıklayın.',
		downloading: '{version} indiriliyor…',
		downloadingPercent: '{version} indiriliyor — %{percent}',
		downloadedBusy:
			'{version} hazır. Bir yakalama sürüyor, bu yüzden uygulamayı kapattığınızda kurulacak.',
		downloaded: '{version} hazır. Yeniden başlatıp kurmak için tıklayın.',
		failed: 'Güncelleme denetimi başarısız oldu: {error}',
		unknownError: 'bilinmeyen hata',
		neverChecked: 'Güncellemeler henüz denetlenmedi.',
		upToDate: 'En güncel sürümdesiniz.',

		alreadyDownloading: 'Güncelleme zaten indiriliyor.',
		alreadyDownloaded: 'Güncelleme zaten indirildi.',
		nothingToDownload: 'İndirilecek bir güncelleme yok.',
		captureInProgress: 'Bir yakalama sürüyor. Bittiğinde tekrar deneyin.',
		nothingToInstall: 'Kurulmaya hazır bir güncelleme yok.',
		captureInProgressInstall:
			'Bir yakalama sürüyor. Uygulamayı kapattığınızda güncelleme kendiliğinden kurulacak.',
		devBuildOnly:
			'Güncelleme denetimleri yalnızca kurulu bir sürümde çalışır.',

		installTitle: 'Güncellemeyi kur',
		installMessage: '{version} sürümü kurulsun mu?',
		installFallbackVersion: 'güncelleme',
		installDetail:
			'Güncelleme kurulduğunda uygulama kapanıp yeniden açılacak. «Sonra»yı seçerseniz, uygulamayı bir sonraki kapatışınızda kendiliğinden kurulacak.',
		installConfirm: 'Yeniden başlat ve kur',
		installLater: 'Sonra',
	},

	filenameFields: {
		categories: {
			Track: 'Pist',
			Driver: 'Sürücü',
			Session: 'Oturum',
			Meta: 'Meta',
		},
		track: 'Pist',
		trackFull: 'Pist (Tam)',
		trackCity: 'Şehir',
		trackCountry: 'Ülke',
		trackType: 'Pist Türü',
		driver: 'Sürücü',
		driverAbbrev: 'Sürücü (Kısa)',
		driverInitials: 'Baş Harfler',
		team: 'Takım',
		carNumber: 'Araç No',
		car: 'Araç',
		carFull: 'Araç (Tam)',
		carClass: 'Araç Sınıfı',
		iRating: 'iRating',
		sessionType: 'Oturum Türü',
		sessionName: 'Oturum Adı',
		lap: 'Tur',
		date: 'Tarih',
		time: 'Saat',
		datetime: 'Tarih+Saat',
		counter: 'Sayaç',
	},

	iracingConfig: {
		projections:
			"Ekran görüntülerinde dikey bantları önlemek için iRacing'de (Display > Monitor sekmesi) «Render Scene Using 3 Projections» seçeneğini kapatın",
	},

	graphicsProfiles: {
		title: 'Grafik Profilleri',
		description:
			'iRacing grafik yapılandırmalarını saklayın ve aralarında geçiş yapın — biri yarış için, biri ekran görüntüleri için, biri video kaydı için. iRacing, yapılandırmayı başlangıçta yükler ve çıkışta geri yazar, bu yüzden çalışırken yapılan bir geçiş geri alınır: <b>yapılandırmaları yalnızca simülatör kapalıyken değiştirin</b>.',
		iracingRunning:
			"Geçiş yapmadan önce iRacing'i kapatın. Çıkışta grafik yapılandırmasını yeniden yazar, bu da değişikliği geri alır.",
		activeHeading: 'Geçerli yapılandırma',
		active: {
			clean: '{name} profilinizle eşleşiyor.',
			modified: {
				one: '{name} tabanlı, o zamandan beri {count} ayar değişti.',
				other: '{name} tabanlı, o zamandan beri {count} ayar değişti.',
			},
			modifiedUnknownCount:
				'{name} tabanlı, o zamandan beri değişiklikler var.',
			unknown: 'Kaydedilmiş herhangi bir profille eşleşmiyor.',
			missing: 'Herhangi bir iRacing grafik yapılandırması bulunamadı.',
		},
		badge: {
			active: 'Etkin',
			modified: 'Değiştirildi',
		},
		picker: {
			unknown: 'Eşleşen profil yok',
			missing: 'Yapılandırma yok',
		},
		empty: {
			title: 'Henüz kaydedilmiş profil yok.',
			body: 'Geçerli iRacing yapılandırmanızı bir profil olarak kaydedin veya mevcut bir .ini dosyasını içe aktarın.',
		},
		invalidProfile: 'Grafik yapılandırması değil',
		warnings: {
			autoCfgIncomplete: 'iRacing tarafından sıfırlanacak',
		},
		actions: {
			load: 'Yükle',
			overwrite: 'Geçerliden güncelle',
			rename: 'Yeniden adlandır',
			export: 'Dışa aktar',
			delete: 'Sil',
			save: 'Kaydet',
			cancel: 'İptal',
			saveCurrent: 'Geçerli olanı şu adla kaydet…',
			import: 'İçe aktar…',
			openFolder: 'Klasörü aç',
		},
		prompt: {
			namePlaceholder: 'Profil adı',
			deleteConfirm: '{name} silinsin mi?',
		},
		feedback: {
			loaded: "{name} yüklendi. Etkin olması için iRacing'i başlatın.",
			saved: 'Şu adla kaydedildi: {name}.',
			overwritten: '{name}, geçerli yapılandırmadan güncellendi.',
			renamed: 'Şu şekilde yeniden adlandırıldı: {name}.',
			deleted: '{name} silindi.',
			imported: 'Şu adla içe aktarıldı: {name}.',
			exported: '{name} dışa aktarıldı.',
		},
		errors: {
			empty: 'Profil için bir ad girin.',
			illegalCharacters:
				'Bir profil adı şunlardan hiçbirini içeremez: < > : " / \\ | ? *',
			reservedName: 'Bu ad Windows tarafından ayrılmış. Başka bir ad seçin.',
			trailingDotOrSpace: 'Bir profil adı nokta veya boşlukla bitemez.',
			tooLong: 'Bu ad çok uzun.',
			duplicate: 'Bu adla bir profil zaten var.',
			profileNotFound: 'Bu profil artık bulunamadı.',
			profileExists: 'Bu adla bir profil zaten var.',
			duplicateContent:
				'Tam olarak bu ayarlara sahip bir profil zaten var: {name}.',
			noActiveConfig:
				'Kaydedilecek bir iRacing grafik yapılandırması bulunamadı.',
			invalidIni:
				'Bu dosya bir iRacing grafik yapılandırması değil, bu yüzden kullanılmadı.',
			iracingRunning:
				"Önce iRacing'i kapatın — çıkışta bu değişikliğin üzerine yazardı.",
			ioError: 'Dosya yazılamadı. Hiçbir şey değişmedi.',
		},
	},

	wgc: {
		cursorCaveat:
			'Bu Windows sürümünde fare imleci yakalamalarda görünebilir. Windows 10 sürüm 2004, imleci gizleyen denetimi ekledi.',
		addonUnavailable:
			'Yüksek sadakatli yakalama bileşeni bu sistemde yüklenemedi.',
		osUnsupported:
			'Windows.Graphics.Capture bu Windows sürümünde kullanılamıyor. Windows 10 sürüm 1903 veya daha yenisi gerekir.',
		nativeCaptureOff: 'Yüksek Sadakatli Yakalama (WGC) kapalı',
	},

	capture: {
		exclusiveFullscreen:
			"iRacing özel tam ekran modunda, bu yüzden ekran görüntüsü siyah çıkardı. iRacing'de Display > Full Screen ayarını OFF yapın (Borderless veya Windowed kullanın) ve yeniden deneyin.",
		exclusiveFullscreenUnattributed:
			'Bir uygulama özel tam ekran modunda çalışıyor, bu da siyah bir yakalama üretir. iRacing tam ekrandaysa, Display > Full Screen ayarını OFF yapın (Borderless veya Windowed kullanın) ve yeniden deneyin.',
		unknownError: 'Bilinmeyen ekran görüntüsü hatası',
		outputTooSmall: 'Yakalama çıktısı çok küçük ({width}x{height})',
		blackFrame:
			'Yakalanan kare siyah — yakalama kaynağı başarısız olmuş olabilir (GPU hızlandırmalı içerik bazı Windows kurulumlarında yakalanamayabilir)',
		noSource:
			'{windowId} penceresi için masaüstü yakalama kaynağı bulunamadı',
		metadataTimeout:
			'Yakalama video meta verileri beklenirken zaman aşımına uğradı',
		noVideoFrame: 'Yakalama akışı bir video karesi üretmedi',
		dimensionTimeout:
			'{width}x{height} pencere boyutları beklenirken zaman aşımına uğradı; {actualWidth}x{actualHeight} ile devam ediliyor',
	},

	longExposureCapture: {
		busy: 'Zaten devam eden bir yakalama var.',
		needsNativeCapture:
			'Uzun pozlama, Yüksek Sadakatli Yakalamayı (WGC) gerektirir. Kullanmak için Ayarlardan açın.',
		unavailable: 'Uzun pozlama bu bilgisayarda kullanılamıyor.',
		noTelemetry:
			"Uzun pozlama, iRacing'den replay telemetrisi gerektirir. Simülatörün çalıştığını ve bir oturumda olduğunu kontrol edin.",
		windowNotFound: 'iRacing penceresi bulunamadı.',
		cancelled: 'Yakalama iptal edildi.',
		seekTimeout:
			'Replay, {frame} karesine zamanında ulaşamadı. Hâlâ yükleniyor olabilir.',
		noPasses: 'Bir yakalama en az bir geçiş çalıştırmalıdır.',
		playbackStalled:
			"Replay oynatılmaya başlamadı. iRacing'in başka bir araç tarafından duraklatılmadığını kontrol edin.",
		exposureTimeout:
			'Pozlama, {seconds} saniye içinde {frame} karesine ulaşamadı.',
		endedEarly: 'Pozlama, seçilen ana ulaşmadan sona erdi.',
		noFramesPresented: 'iRacing yakalanacak hiçbir kare sunmadı.',
		subFrameNoSamples:
			'Bu enstantane bir replay karesinden daha kısa ve iRacing bu sürede bir kare render etmedi. Daha yavaş bir oynatma hızı veya bir sonraki daha yavaş enstantaneyi deneyin.',
		noSamples:
			'Hiçbir kare biriktirilmedi. iRacing, pozlama sırasında render işlemini durdurmuş olabilir.',
		blankCapture:
			"Yakalanan her kare siyahtı, bu yüzden kaydedilecek bir görüntü yok. iRacing'in özel tam ekran yerine pencereli veya kenarlıksız modda olduğunu ve bu çözünürlükte hâlâ boş video belleği kaldığını kontrol edin — denenecek en hızlı şey daha düşük bir yakalama çözünürlüğüdür.",
		frozenCapture:
			'iRacing, pozlama sırasında {samples} kare sundu ama hepsi birbirinin aynıydı, bu yüzden bu görüntü uzun pozlama değil, sabit bir kare. Replay ilerlerken iRacing hiçbir yeni şey render etmedi.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'GPU bir görüntü döndürmedi.',
		bracketShortfall:
			'Bracketleme {asked} kademe istedi ama {returned} tanesi döndü — geri kalanı işlenemedi, ya da yakalama eklentisinin bu sürümü bracketlemeden önceki bir sürüm.',
	},

	validation: {
		windowBeforeStart:
			'Pozlamanın seçilen andan önce {frames} replay karesine ihtiyacı var, ama replay içinde yalnızca {anchor} kare ilerlemiş durumda. Daha sonraki bir an veya daha hızlı bir enstantane seçin.',
		pastEnd: "Seçilen an, replay'in sonunu geçmiş durumda.",
		sessionChanged:
			'Bu çekim ayarlandığından beri replay farklı bir oturuma geçti. Anı yeniden seçin.',
		singleSampleMultiPass:
			'Bu enstantane o kadar kısa ki geçiş başına yalnızca yaklaşık bir kare düşüyor, bu yüzden {passes} geçiş yaklaşık {passes} örnek toplar. Daha yavaş bir oynatma hızı veya daha yavaş bir enstantane çok daha fazlasını sağlar.',
		singleSample:
			'Bu enstantane o kadar kısa ki içine yalnızca bir kare düşecek, bu yüzden sonuçta hareket bulanıklığı olmayacak. Daha yavaş bir oynatma hızı veya daha yavaş bir enstantane örnek sağlar.',
		bracketVsInterpolation:
			'Enstantane Bracketleme ve {factor}x kare ara değerleme aynı anda çalışamaz, bu yüzden bu çekim ara değerleme olmadan yapılacak. Ara değerler sizin için ekstra kademelerden daha önemliyse bracketlemeyi kapatın.',
		passesVsInterpolation:
			'Hem çoklu geçiş hem de {factor}x ara değerleme açık. Bunlar birbiriyle yarışır: ara değerleme her geçişi, ona gerçek kareler kaybettirecek kadar yavaşlatır, bu yüzden aynı bekleme süresi tek başına geçişlerin sağlayacağından daha az gerçek örnek verir. Ara değerlemeyi kapatmak genellikle daha iyi bir çekim sağlar.',
		shortOfTarget:
			'1/{divisor} hızda bile bu pozlama yalnızca yaklaşık {samples} örneğe ulaşıyor, istenen {target} örneğin altında kalıyor. Daha fazlası için daha yavaş bir enstantane kullanın.',
		longCaptureEscalate:
			"Bu yakalama, replay'i 1/{divisor} hızda yaklaşık {duration} gerçek zaman boyunca{passSuffix} oynatır ve başladıktan sonra hızlandırılamaz. {advice}",
		longCaptureWarn:
			'Bu yakalama, 1/{divisor} oynatma hızında yaklaşık {duration} gerçek zaman sürecek{passSuffix}.',
		passSuffix: ', aynı an üzerinde {passes} geçiş boyunca',
		adviceFewerPasses: 'Daha az geçiş, daha az örnekle daha erken biter.',
		adviceFasterPlayback:
			'Daha hızlı bir oynatma hızı, daha az örnekle daha erken biter.',
		pastLogCap:
			'Bu yakalamanın {passes} geçiş boyunca yaklaşık {samples} örnek toplaması bekleniyor; bu, tanı günlüğünün tuttuğu {cap} sınırını aşıyor. Görüntü etkilenmez — yalnızca düzenlilik ve boşluk değerleri yakalamanın yalnızca ilk kısmını yansıtır.',
		interpolationLossy:
			'Bu boyutta, {factor}x ara değerleme bu bilgisayara daha önce gerçek örneklere mal olmuştu. Daha düşük bir çarpan, daha düşük bir Çözünürlük veya bunun yerine daha fazla geçiş düşünün.',
	},

	duration: {
		zero: '0 saniye',
		seconds: {
			one: '{count} saniye',
			other: '{count} saniye',
		},
		minutes: {
			one: '{count} dakika',
			other: '{count} dakika',
		},
		minutesSeconds: '{minutes} dk {seconds} sn',
	},

	// The iRacing configuration editor page. Setting labels/helps are addressed
	// mechanically as settings.<sectionSlug>.<key>.label|.help — the schema in
	// utilities/iracing-settings-schema.ts derives the keys, and its test fails
	// if one is missing here.
	iniEditor: {
		title: 'iRacing Yapılandırma Düzenleyicisi',
		nav: {
			home: 'Ekran Görüntüleri',
			config: 'iRacing yapılandırması',
		},
		tabs: {
			monitor: 'Monitör / Ekran',
			graphics: 'Grafik',
		},
		mode: {
			label: 'Şu anda düzenlenen yapılandırma:',
			// Mode names come from iRacing's own filenames; Legacy is the bare
			// rendererDX11.ini only old-website launches still read.
			legacy: 'Eski',
		},
		actions: {
			save: 'Değişiklikleri kaydet',
			discard: 'Vazgeç',
			reload: 'Yeniden yükle',
			browse: 'Gözat…',
		},
		state: {
			dirty: {
				one: 'Kaydedilmemiş {count} değişiklik',
				other: 'Kaydedilmemiş {count} değişiklik',
			},
			saved: 'Değişiklikler {file} dosyasına kaydedildi',
			simRunning:
				"iRacing çalışıyor. Bu ayarları bellekte tutar ve çıkışta dosyayı yeniden yazar, bu yüzden şimdi yapılan düzenlemeler kaybolur. Düzenlemek için iRacing'i kapatın.",
			stale: "Bu dosya yüklendiğinden beri diskte değişti — genellikle iRacing'in çıkışta dosyayı yeniden yazması nedeniyle. Geçerli değerleri görmek için yeniden yükleyin.",
			keyMissing: 'Bu dosyada yok',
			noModes:
				"{folder} içinde hiçbir render yapılandırma dosyası bulunamadı. Bunları oluşturmak için iRacing'i bir kez başlatın veya aracı iRacing klasörünüze yönlendirin.",
			loadFailed: 'Yapılandırma dosyası okunamadı.',
			discardConfirm: 'Kaydedilmemiş {count} değişiklikten vazgeçilsin mi?',
		},
		folder: {
			label: 'iRacing klasörü',
			autoDetected: 'Otomatik algılandı',
			reset: 'Otomatik algılamayı kullan',
			help: "iRacing'in yapılandırma dosyalarını tuttuğu yer. Documents\\iRacing klasörünün otomatik algılanması için boş bırakın.",
		},
		errors: {
			iracingRunning:
				"Önce iRacing'i kapatın — çıkışta bu değişikliğin üzerine yazardı.",
			staleFile:
				'Dosya yüklendiğinden beri diskte değişti. Yeniden yükleyip tekrar deneyin.',
			validationFailed:
				'Değerlerden biri geçerli değil. Hiçbir şey değişmedi.',
			keyNotFound:
				'Bir ayar dosyada bulunamadı, bu yüzden hiçbir şey değişmedi. Yeniden yükleyip tekrar deneyin.',
			fileNotFound: 'Yapılandırma dosyası artık mevcut değil.',
			ioError: 'Dosya yazılamadı. Hiçbir şey değişmedi.',
		},
		groups: {
			window: 'Pencere yerleşimi',
			fullscreen: 'Tam ekran',
			quality: 'Kalite ve ayrıntı',
			aa: 'Kenar yumuşatma ve keskinleştirme',
			post: 'Son işleme',
			perf: 'Performans',
			misc: 'Diğer',
		},
		// Shared tier vocabulary for enum settings.
		levels: {
			off: 'Kapalı',
			low: 'Düşük',
			medium: 'Orta',
			high: 'Yüksek',
			max: 'Maksimum',
			ultra: 'Ultra',
		},
		nvReflex: {
			off: 'Kapalı',
			on: 'Açık',
			onBoost: 'Boost',
		},
		shadowDetail: {
			fewer: 'Daha az gölge',
			maximum: 'Maksimum gölge',
		},
		aaMethod: {
			none: 'Yok',
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
			soft: 'Yumuşak',
			neutral: 'Nötr',
			sharp: 'Keskin',
			simple: 'Basit',
		},
		dnsmFilter: {
			off: 'Kapalı',
			simple: 'Basit',
			pcf4: 'PCF4',
			pcf4p: 'PCF4P',
			pcf8p: 'PCF8P',
			pcf16p: 'PCF16P',
		},
		dynamicShadowMaps: {
			off: 'Kapalı',
			mainView: 'Ana görünümde',
			mainViewMirrors: 'Ana görünümde ve aynalarda',
		},
		hideObstructions: {
			none: 'Yok',
			halo: "Halo'yu gizle",
			pillarRollcage: 'A sütunlarını ve devrilme kafesini gizle',
			everything: 'Her şeyi gizle',
		},
		replayScope: {
			label: 'Replay grafiklerine de uygula',
		},
		// Inline hints under a field whose pending value cannot be saved. Only
		// numeric inputs can go invalid (switches and dropdowns cannot), and
		// every bounded numeric in the schema carries both bounds.
		invalid: {
			intRange: '{min} ile {max} arasında bir tam sayı girin.',
			int: 'Bir tam sayı girin.',
			floatRange: '{min} ile {max} arasında bir sayı girin.',
			float: 'Bir sayı girin.',
		},
		layout: {
			title: 'Monitör düzeni',
			primary: 'Birincil',
			windowTarget: 'iRacing penceresi',
			estimated:
				'Tahmini — Windows ve iRacing ekranları farklı numaralandırır, bu yüzden vurgulama konuma göre eşleştirilir.',
		},
		settings: {
			display: {
				border: { label: 'Pencere kenarlığı' },
				windowedXPos: { label: 'Pencere sol konumu' },
				windowedYPos: { label: 'Pencere üst konumu' },
				windowedWidth: { label: 'Pencere genişliği' },
				windowedHeight: { label: 'Pencere yüksekliği' },
				windowedMaximized: { label: 'Büyütülmüş olarak başlat' },
				windowedAlignment: {
					label: 'Pencere hizalaması',
					help: 'iRacing bu değeri belgelemiyor. İstediğiniz hizalama dizinini bilmiyorsanız değiştirmeden bırakın.',
				},
				fullScreen: { label: 'Tam ekran' },
				fullScreenWidth: { label: 'Tam ekran genişliği' },
				fullScreenHeight: { label: 'Tam ekran yüksekliği' },
				fullScreenDepth: {
					label: 'Tam ekran renk derinliği',
					help: 'Piksel başına bit. Neredeyse her modern sistemde 32.',
				},
				RefreshRate: {
					label: 'Yenileme hızı',
					help: '0, ekranın varsayılan yenileme hızını kullanır.',
				},
			},
			graphics: {
				ShaderQuality: { label: 'Gölgelendirici kalitesi' },
				ShadowDetail: { label: 'Gölge ayrıntısı' },
				DynamicShadowMaps: {
					label: 'Dinamik gölge haritaları',
					help: 'Araçlar ve diğer hareketli nesneler için gölge haritaları. Yalnızca gündüz.',
				},
				DNSMFilter: {
					label: 'Gölge haritası filtresi',
					help: 'Dinamik gece gölge haritaları için kullanılan filtre.',
				},
				CarDetail: { label: 'Araç ayrıntısı' },
				PitObjectDetail: { label: 'Pit nesnesi ayrıntısı' },
				CrowdDetail: { label: 'Seyirci ayrıntısı' },
				GrandstandDetail: { label: 'Tribün ayrıntısı' },
				ObjectDetail: { label: 'Nesne ayrıntısı' },
				FoliageDetail: { label: 'Bitki örtüsü ayrıntısı' },
				ParticleDetail: { label: 'Parçacık ayrıntısı' },
				ParticlesFullRes: { label: 'Tam çözünürlüklü parçacıklar' },
				MirrorDetail: { label: 'Aynalarda daha yüksek ayrıntı' },
				MaxCockpitMirrors: { label: 'Maksimum kokpit aynası' },
				AntiAliasMethod: { label: 'Kenar yumuşatma yöntemi' },
				MSAASamples: { label: 'MSAA örnek sayısı' },
				MSAAUseFilter: { label: 'MSAA filtresi' },
				Sharpening: { label: 'Keskinleştirme' },
				SharpeningAmount: {
					label: 'Keskinleştirme miktarı',
					help: 'Keskinleştirme filtresinin gücü.',
				},
				FSRSharpness: {
					label: 'FSR keskinliği',
					help: 'Çözünürlük ölçekleme FSR ile yükseltme yaparken kullanılan keskinlik.',
				},
				AutoExposure: {
					label: 'Otomatik pozlama',
					help: 'Yalnızca HDR render etkinken çalışır.',
				},
				SSAO: { label: 'Ortam örtüşmesi (SSAO)' },
				SSRLevel: {
					label: 'Ekran uzayı yansımaları',
					help: 'Düşük, yansımaları daha düşük çözünürlükte render eder; Yüksek ise tam çözünürlükte.',
				},
				SSRRainOnly: {
					label: 'Yansımalar yalnızca yağmurda',
					help: 'Ekran uzayı yansımalarını ıslak pist koşullarıyla sınırlar — simülatördeki Low Rain ve High Rain seçenekleri.',
				},
				HeatHaze: { label: 'Isı pusu' },
				DepthOfField: { label: 'Alan derinliği' },
				MotionBlurStrength: { label: 'Hareket bulanıklığı gücü' },
				Distortion: { label: 'Lens bozulması' },
				EnableHDR: { label: 'HDR render' },
				LimitFrameRate: { label: 'Kare hızını sınırla' },
				DesiredFPSLimit: { label: 'Kare hızı sınırı' },
				VerticalSync: { label: 'Dikey eşitleme' },
				NvReflexMode: { label: 'NVIDIA Reflex' },
				MaxPreRenderedFrames: {
					label: 'Maksimum ön render edilmiş kare',
					help: "GPU'nun CPU'nun ne kadar gerisinde kalabileceği. 1 normaldir; 0, çoklu GPU kurulumları için kuyruğu devre dışı bırakır.",
				},
				SysMemToUseMB: { label: 'Kullanılacak sistem belleği' },
				VidMemToUseMB: { label: 'Kullanılacak video belleği' },
				MaxCarsToDraw: { label: 'Çizilecek maksimum araç' },
				MaxCarsToDrawInMirrors: { label: 'Aynalardaki maksimum araç' },
				VirtualMirrors: { label: 'Sanal aynalar' },
				UIScale: { label: 'UI ölçeği' },
				EnableTireMarks: { label: 'Lastik izleri' },
				HideCockpitObstructions: { label: 'Kokpit engellerini gizle' },
				HeadlightLevel: { label: 'Far kalitesi' },
			},
		},
	},
};

export default tr;
