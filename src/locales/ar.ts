// Arabic. Translated from en.ts — see that file's header before editing.
//
// NOTE ON PLURALS. Arabic has six CLDR categories and this catalogue supplies all
// six on every plural node, because every one of them is reached by the whole
// numbers these messages carry:
//   zero  n = 0              → 0 تمريرة
//   one   n = 1              → 1 تمريرة
//   two   n = 2              → 2 تمريرتان
//   few   n % 100 = 3..10    → 3 تمريرات
//   many  n % 100 = 11..99   → 11 تمريرة
//   other everything else    → 100 تمريرة
// The counted noun changes with the category, not just the verb: `few` takes the
// plural while `many` and `other` take the singular, so letting 3..10 fall back to
// `other` yields a grammatically wrong sentence rather than an obviously missing
// one. The selector uses Intl.PluralRules, so all six forms are actually reached.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.
// So do iRacing's own menu labels wherever the text tells the reader which control
// to change — Display > Full Screen, OFF, Borderless, Windowed, Shot Selection —
// because the sim shows them in English whatever language this app is set to.

import type { Catalog } from './index';

const ar: Catalog = {
	notice: {
		danger: 'مشكلات',
		warning: 'ما يجدر معرفته',
		info: 'ملاحظات',
	},

	promo: {
		greeting: 'شكرًا لاستخدامك iRacing Screenshot Tool!',
		signature: 'من تطوير AR Media Solutions وصيانتها.',
	},

	changelog: {
		title: 'سجل التغييرات',
		untitledRelease: 'إصدار',
	},

	gallery: {
		menu: {
			openExternally: 'فتح في تطبيق خارجي',
			openFolder: 'فتح المجلد',
			copy: 'نسخ',
			delete: 'حذف',
		},
		copiedToClipboard: 'تم نسخ {name} إلى الحافظة',
	},

	sidebar: {
		resolution: 'الدقة',
		width: 'العرض',
		height: 'الارتفاع',
		// Carries its own colon, so a language that spaces punctuation differently
		// can place it.
		output: 'الناتج:',
		cropWatermark: 'اقتصاص العلامة المائية',
		keepAspectRatio: 'الحفاظ على نسبة الأبعاد',
		screenshot: 'لقطة شاشة',
		custom: 'مخصصة',
		vramStatus: '{adapter}{free} متاحة من أصل {total}',
		savedSuccessfully: 'تم حفظ {name} بنجاح',
		screenshotFailed: 'فشلت لقطة الشاشة: {message}',
		// The trailing space is load-bearing — the log path is appended to it.
		errorLogPrefix: 'السجل: ',
		notices: {
			exclusiveFullscreen:
				'iRacing في وضع ملء الشاشة الحصري — ستكون لقطات الشاشة سوداء. في iRacing اضبط Display > Full Screen على OFF (استخدم Borderless أو Windowed) لتمكين الالتقاط.',
			vramRisk:
				'تحتاج {resolution} إلى نحو {needed} إضافية من VRAM بينما المتاح {free} فقط — من المرجح أن تنفد ذاكرة iRacing ويتعطل.',
			vramCaution:
				'تترك {resolution} هامشًا ضئيلًا من VRAM ({free} متاحة) وقد تتعطل مع تركيبات الحلبات والسيارات الثقيلة.',
			switchResolution: 'التبديل إلى {resolution}',
			vramStatic:
				'قد تتسبب الدقات العالية في تعطل iRacing إذا نفدت ذاكرة VRAM. وبعض تركيبات الحلبات والسيارات تحتاج إلى المزيد منها.',
			reshade:
				'بعد الضغط على زر لقطة الشاشة في iRacing Screenshot Tool، عليك الضغط على اختصار التقاط لقطة الشاشة الخاص بـ ReShade.',
			crop: 'يقرّب اقتصاص العلامة المائية الصورة النهائية قليلًا. وستُقتطع المناطق القريبة من حواف الشاشة.',
			aspectRatio:
				'يضبط "الحفاظ على نسبة الأبعاد" ارتفاع لقطة الشاشة ليطابق نسبة أبعاد شاشتك (مثل 21:9 فائقة العرض) بدلًا من 16:9 الافتراضية. والدقة المختارة تحدد العرض.',
		},
	},

	settings: {
		title: 'الإعدادات',
		version: 'الإصدار - {version}',
		changelog: 'سجل التغييرات',
		openLogsFolder: 'فتح مجلد السجلات',
		checkForUpdates: 'التحقق من التحديثات',
		updateCheckFailed: 'فشل التحقق من التحديثات: {message}',

		language: 'اللغة',
		languageDescription:
			'اللغة المستخدمة في التطبيق بأكمله. تُكتشف من Windows عند أول تشغيل للتطبيق.',

		screenshotFolder: 'مجلد لقطات الشاشة',
		selectFolder: 'اختيار مجلد',
		screenshotKeybind: 'اختصار لقطة الشاشة',
		editBind: 'تعديل الاختصار',

		customFilenameFormat: 'تنسيق مخصص لاسم الملف',
		// The tokens here are literal text the user types, not placeholders to be
		// filled in — they must survive translation exactly as written.
		customFilenameFormatDescription:
			'استخدم نمطًا مخصصًا بدلًا من الافتراضي ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'انقر الحقول لإضافتها إلى التنسيق. واكتب الفواصل (-، _ وغيرها) مباشرةً.',
		reset: 'إعادة تعيين',
		preview: 'معاينة:',

		outputFormat: 'تنسيق الإخراج',
		formatJpeg: 'JPEG (أعلى جودة)',
		formatPng: 'PNG (بلا فقدان)',
		formatWebp: 'WebP (جودة 95%)',

		disableTooltips: 'تعطيل التلميحات',
		disableTooltipsDescription: 'دعني وشأني، فأنا أعرف ما أفعل',

		cropTopLeft: 'تفضيل اقتصاص العلامة المائية من أعلى اليسار',
		cropTopLeftDescription:
			'يقتصّ الزاوية السفلية اليمنى فقط (3%). وعند إيقافه تُقتصّ لقطة الشاشة (6% إجمالًا) بالتساوي من جميع الجهات للحصول على نتيجة متمركزة.',

		manualWindowRestore: 'استعادة النافذة يدويًا',
		manualWindowRestoreDescription:
			'يتجاوز الاستعادة التلقائية للنافذة بموضع وحجم مخصصين. مفيد لمن يستخدمون شاشة فائقة العرض أو Nvidia Surround',
		left: 'اليسار',
		top: 'الأعلى',
		width: 'العرض',
		height: 'الارتفاع',
		restoreNow: 'استعادة الآن',

		nativeCapture: 'التقاط عالي الجودة (WGC)',
		nativeCaptureDescription:
			'يلتقط ألوانًا حقيقية بلا اختزال للعينات عبر Windows.Graphics.Capture بدلًا من المسار الافتراضي (الذي يختزل عينات اللون). ويعود تلقائيًا إلى المسار الافتراضي إذا فشل الالتقاط.',
		nativeCaptureUnavailable:
			'غير متاح على هذا النظام — لا يمكن تشغيل الالتقاط عالي الجودة هنا.',
		nativeCaptureUnverified:
			'يفيد Windows بأن هذه الميزة مدعومة، لكن التقاطًا اختباريًا لم يعُد بنتيجة. وسيعود الالتقاط تلقائيًا إلى المسار الافتراضي إذا استمر الفشل.',

		reshade: 'وضع التوافق مع ReShade',
		reshadeDescription:
			'عند استخدام ReShade عليك أولًا استخدام اختصار iRacing Screenshot Tool أو الضغط على الزر، ثم استخدام اختصار لقطة الشاشة الخاص بـ ReShade بعد أن يتغير حجم نافذة iRacing',
		reshadeIni: 'ملف ReShade INI',
		selectFile: 'اختيار ملف',
	},

	longExposure: {
		title: 'التعريض الطويل',
		shutter: 'الغالق',
		playbackSpeed: 'سرعة التشغيل',
		playbackAuto: 'تلقائي (من عدد العينات المستهدف)',
		playbackRealTime: '1x (الزمن الحقيقي)',
		targetSamples: 'عدد العينات المستهدف',
		advanced: 'خيارات متقدمة',
		defaultsSummary: 'القيم الافتراضية: {count}',

		weighting: 'الترجيح',
		weightingBox: 'Box (متساوٍ)',
		weightingLinear: 'خطي (حاد عند النهاية)',
		weightingEase: 'Ease (بداية أحدّ وذيل طويل)',
		weightingBoxShort: 'Box',
		weightingLinearShort: 'خطي',
		weightingEaseShort: 'Ease',

		passes: 'التمريرات',
		passes1: '1 (تمريرة واحدة)',
		passes2: '2× — ضعف مدة الانتظار',
		passes4: '4× — أربعة أضعاف مدة الانتظار',
		passes8: '8× — ثمانية أضعاف مدة الانتظار',

		warmUp: 'إحماء المؤثرات',
		warmUpOff: 'إيقاف',
		warmUp1: '1 ث',
		warmUp3: '3 ث (موصى به)',
		warmUp5: '5 ث — للدخان المتبقي',
		warmUpValue: '{seconds} ث',

		bracket: 'مضاهاة سرعات الغالق',
		highlightRecovery: 'استرجاع الإضاءات العالية (EV)',
		highlightRecoveryOff: 'إيقاف',

		cancel: 'إلغاء',
		saved: 'تم حفظ التعريض الطويل — عدد العينات: {count}',
		failed: 'فشل التعريض الطويل',

		// These read as fragments in a comma-separated list, not as sentences, so
		// they stay short and carry no final punctuation.
		modified: {
			weighting_linear: 'خطي',
			weighting_ease: 'ease',
			passes: {
				zero: '{count} تمريرة',
				one: '{count} تمريرة',
				two: '{count} تمريرتان',
				few: '{count} تمريرات',
				many: '{count} تمريرة',
				other: '{count} تمريرة',
			},
			bracketed: 'مع مضاهاة',
			warmUp: 'إحماء {seconds} ث',
			warmUpOff: 'بلا إحماء',
			recovery: 'استرجاع {stops} EV',
		},

		progress: {
			working: 'جارٍ العمل…',
			warming: 'جارٍ إحماء المؤثرات…{pass}',
			seeking: 'جارٍ التموضع…{pass}',
			accumulating: 'جارٍ التعريض… عدد العينات: {count}{pass}',
			resolving: 'جارٍ التحميض…',
			restoring: 'جارٍ استعادة حالة الإعادة…',
			// Appended to the lines above, so the leading space is part of it.
			pass: ' (التمريرة {current} من {total})',
		},

		notices: {
			needsNativeCapture:
				'يحتاج التعريض الطويل إلى الالتقاط عالي الجودة (WGC)، وهو معطّل حاليًا. فعّله في الإعدادات لتمكين التعريض الطويل.',
			unavailableWithReason:
				'التعريض الطويل غير متاح على هذا الجهاز: {reason}',
			unavailable: 'التعريض الطويل غير متاح على هذا الجهاز.',
			passes:
				'تعيد كل تمريرة تشغيل اللحظة نفسها وتلتقط إطارات فاتت غيرها، فيصبح الأثر أنعم لا أكثر سطوعًا. وهي الأفضل مع سرعات الغالق العالية، حيث تجمع التمريرة الواحدة عددًا قليلًا من العينات.',
			reshade:
				'يلتقط التعريض الطويل بشكل أصلي ولا يستخدم ReShade، لذا لن تظهر تأثيرات ReShade في النتيجة.',
		},
	},

	help: {
		title: 'المساعدة',
		sections: 'أقسام المساعدة',
		tabGeneral: 'عام',
		tabLongExposure: 'التعريض الطويل',
		tabFaq: 'الأسئلة الشائعة',

		general: {
			iracingSettings: 'إعدادات iRacing',
			borderless: 'يجب أن يعمل iRacing في وضع Windowed Borderless',
			vram: 'يُنصح بـ 8 غيغابايت على الأقل من VRAM للقطات الشاشة بدقة 8K أو أعلى',
			newerContent: 'تحتاج الحلبات والسيارات الأحدث إلى مزيد من VRAM',
			shrinkUi:
				'إذا كنت تستخدم خيار اقتصاص العلامة المائية، فصغّر الواجهة إلى أصغر حجم ممكن قبل التقاط لقطة الشاشة؛ الاختصار "Control+PageDown" يصغّرها، وإذا لم ينجح ذلك فقد تحتاج إلى إعادة ضبط تكبير الواجهة في إعدادات iRacing',

			screenshotFolder: 'مجلد لقطات الشاشة',
			screenshotFolderBody:
				'تُحفظ لقطات الشاشة افتراضيًا في "C:\\Users\\user\\Pictures\\Screenshots" ويمكن تغيير ذلك في الإعدادات',

			screenshotHotkey: 'اختصار لقطة الشاشة',
			screenshotHotkeyBody:
				'افتراضيًا يلتقط "Control + PrintScreen" لقطة شاشة بالإعدادات الحالية، ويمكن تغيير ذلك في الإعدادات.',

			issues: 'المشكلات',
			issuesBody: 'إذا واجهت أي مشكلات فيُرجى الإبلاغ عنها على',
			discord: 'Discord',

			instructions: 'التعليمات',
			step1: '<b>يجب</b> أن يعمل iRacing في وضع Windowed Borderless',
			step2: 'شغّل iRacing واضبط الكاميرا في الموضع الذي تريد التقاط لقطة الشاشة منه',
			step3: 'اختر الدقة التي تريدها (جرّب دقات أقل قبل الانتقال إلى 8K)',
			step4: 'حدّد ما إذا كنت تريد اقتصاص علامة iRacing المائية أم لا؛ فإن أردت اقتصاصها فعليك أولًا تصغير واجهة iRacing إلى أصغر حجم باستخدام "Control + PageDown"',
			step5: 'اضغط زر لقطة الشاشة أو استخدم الاختصار "Control + PrintScreen" لالتقاط اللقطات',
			step6: 'حسب الدقة المختارة قد يستغرق ذلك بضع ثوانٍ؛ وعندما تعود شاشة iRacing إلى حجمها الطبيعي تكون العملية قد انتهت',
			step7: 'ستُحفظ لقطة الشاشة في "C:\\Users\\{User}\\Pictures\\Screenshots"',
		},

		longExposure: {
			whatItDoes: 'ما الذي يفعله',
			whatItDoesBody:
				'يمزج التعريض الطويل عددًا كبيرًا من إطارات الإعادة في صورة واحدة، تمامًا كما يفعل ترك غالق الكاميرا مفتوحًا: تبقى الأشياء الساكنة حادة، وتترك الأشياء المتحركة أثرًا ممتدًا. تتحكم الأداة بالإعادة بنفسها، وتلتقط كل إطار يعرضه المحاكي، ثم تجمعها على GPU.',

			shutter: 'الغالق',
			shutterBody:
				'كم يدوم التعريض <i>بزمن الإعادة</i>، من جزء من إطار إعادة واحد وحتى عشر ثوانٍ. هذا هو الإعداد الذي يحدد طول الآثار. كما تجمع أزمنة الغالق الأطول إطارات أكثر، فتحتاج إلى مساعدة أقل مما يليها؛ وأسرع الدرجات تغطي إطار إعادة واحدًا وتجمع عددًا قليلًا من العينات.',

			playback: 'سرعة التشغيل',
			playbackBody:
				'تُشغَّل الإعادة بالحركة البطيئة أثناء التقاط التعريض، فيعرض المحاكي إطارات أكثر لكل ثانية من زمن الإعادة ويحصل المزج على عينات أكثر. تجمع 1/16 نحو ستة عشر ضعف عدد الإطارات مقارنةً بالزمن الحقيقي — وتستغرق ستة عشر ضعف الوقت على الساعة. هذه هي المقايضة الأساسية في هذه اللوحة: الصبر مقابل النعومة.',
			playbackAutoBody:
				'يختار "تلقائي (من عدد العينات المستهدف)" السرعة نيابةً عنك اعتمادًا على <b>عدد العينات المستهدف</b>: تحسب الأداة أسرع تشغيل يبلغ العدد الذي طلبته. واضبط سرعة صريحة بدلًا من ذلك إن كنت تفضل وضع سقف لمدة الانتظار.',

			weighting: 'الترجيح',
			weightingBody:
				'مقدار مساهمة كل إطار ملتقط في النتيجة. يرجّح <b>Box</b> الإطارات كلها بالتساوي فيعطي أثرًا منتظمًا. أما <b>الخطي</b> فيتصاعد نحو نهاية النافذة، فيكون الهدف أشد حدة حيث انتهى ويتلاشى على امتداد مساره. و<b>Ease</b> هو الفكرة نفسها ببداية أحدّ وذيل أطول.',

			passes: 'التمريرات',
			passesBody:
				'تزور اللحظة نفسها عدة مرات وتراكم ذلك كله في صورة واحدة. تلتقط كل تمريرة إطارات فاتت غيرها مصادفةً، فيصبح الأثر أنعم — لا أكثر سطوعًا، لأن النتيجة تُسوّى بحسب كمية الضوء التي سقطت فعليًا على كل بكسل.',
			passesTradeBody:
				'تقايض التمريرات زمن الانتظار بالعينات: تستغرق ثماني تمريرات نحو ثمانية أضعاف الوقت، وكل عينة تضيفها هي إطار حقيقي. ولذلك فهي الأداة المناسبة مع سرعات الغالق العالية، حيث تجمع التمريرة الواحدة عينات قليلة جدًا، ومع الدقة العالية، حيث يعرض iRacing إطارات أقل في كل تمريرة.',

			bracket: 'مضاهاة سرعات الغالق',
			bracketBody:
				'تُخرج صورة واحدة لكل درجة غالق تساوي ما اخترته أو أسرع منه، من التقاط واحد. فاللقطة عند 1/60 تعطيك أيضًا 1/125 و1/250 و1/500 و1/1000 — اللحظة نفسها بآثار أقصر تدريجيًا — لتختار الشكل الذي تريده لاحقًا بدل التخمين وإعادة التصوير.',
			bracketCostBody:
				'ولا يكلف ذلك وقتًا إضافيًا يُذكر. فكل درجة تنتهي عند الإطار نفسه ولا تختلف إلا في مدى امتدادها إلى الوراء، لذا فالغالق الأسرع ما هو إلا ذيل الإطارات المارّة أصلًا — وكلها تُملأ من تمريرة واحدة للإعادة.',
			bracketMemoryBody:
				'أما ما يكلفه فعلًا فهو الذاكرة. فكل درجة تحتاج إلى مراكم خاص بها بالدقة الكاملة، لذا تحتاج إحدى عشرة درجة إلى أحد عشر ضعف ذاكرة الفيديو التي تحتاجها درجة واحدة، وهو ما يتجاوز عند 8K ما تملكه معظم البطاقات. يتحقق الالتقاط من ذلك قبل أن يبدأ ويرفض بدلًا من التسبب في تعطل iRacing، فإذا رُفضت المضاهاة فاخفض الدقة أو اختر غالقًا أسرع — وهو أيضًا سلّم أقصر.',
			bracketNamingBody:
				'تُحفظ الدرجة التي اخترتها بالاسم المعتاد وهي التي تظهر في المعرض؛ أما البقية فتوضع بجانبها مع سرعة الغالق في اسم الملف.',

			warmUp: 'إحماء المؤثرات',
			warmUpBody:
				'لا تُخزَّن في الإعادة الأتربة المتطايرة ودخان الإطارات ولهب العادم وضبابية العجلات الدوّارة — فـ iRacing يحاكيها أثناء التشغيل، وتختفي كلما قفزت الإعادة. لذلك تُرجَع الإعادة قبل كل تمريرة إلى الخلف قليلًا وتُشغَّل بالسرعة العادية طوال هذه المدة، ثم تُبطَّأ قبيل بدء التعريض مباشرة، فتكون المؤثرات موجودة أصلًا عند بدئه. وتكلّف نحو هذا العدد من الثواني لكل تمريرة. ارفعها إذا كان دخان الإطارات ما يزال يخفّ في بداية الأثر؛ وأوقفها فقط إن أردت السلوك القديم.',

			highlights: 'استرجاع الإضاءات العالية',
			highlightsBody:
				'يعزز الإضاءات القريبة من الاقتطاع قبل جمع الإطارات، ثم يلغي التعزيز في النهاية. فـ iRacing يسلّم صورة سبق أن طُبّق عليها التعيين اللوني، فيصل ضوء المصباح الأمامي والجدار الأبيض بالقيمة نفسها؛ ومتوسط ذلك يجعل ضوءًا ساطعًا يمر خلال جزء من التعريض يبدو لطخة رمادية بدل أثر ساطع. وهذا يعيد اللاخطية إلى موضعها في المستشعر الحقيقي. يُقاس بدرجات التعريض (EV)؛ والقيمة 0 تعني الإيقاف ولا تغيّر شيئًا على الإطلاق.',

			whatItSaves: 'ما الذي يحفظه',
			whatItSavesBody:
				'يتبع الحجم واقتصاص العلامة المائية وتنسيق الملف الضوابط نفسها التي تستخدمها لقطة الشاشة العادية — إعدادا الدقة واقتصاص العلامة المائية أعلاه، وتنسيق الإخراج في الإعدادات. ويعرض سطر "الناتج" أعلى الشريط الجانبي ما ستحصل عليه بالضبط.',
			whatItSavesPngBody:
				'يكتب اختيار PNG نسخة أصلية حقيقية بعمق 16 بت، وهي تستحق العناء إن كنت تنوي معالجة ألوان اللقطة لاحقًا، إضافةً إلى معاينة بعمق 8 بت للمعرض. كما أن كتابته أبطأ بكثير عند الدقات العالية — إذ يستغرق ملف PNG بعمق 16 بت وحجم 33 ميغابكسل نحو عشر ثوانٍ، بينما يستغرق الإطار نفسه بتنسيق JPEG أقل من ثانية.',

			troubleshooting: 'إذا بدت النتيجة خاطئة',
			troubleGhosts:
				'<b>أشباح منفصلة بدل أثر ناعم</b> — عدد العينات قليل جدًا. استخدم سرعة تشغيل أبطأ أو تمريرات أكثر أو دقة أقل.',
			troubleShutter:
				'<b>لست متأكدًا من زمن الغالق الذي تريده</b> — فعّل مضاهاة سرعات الغالق وقرر لاحقًا، بمدة الانتظار نفسها.',
			troubleHighlights:
				'<b>إضاءات عالية محترقة أو مسطحة</b> — جرّب من 3 إلى 5 درجات من استرجاع الإضاءات العالية.',
			troubleBlack:
				'<b>صورة سوداء</b> — iRacing في وضع ملء الشاشة الحصري. اضبط Display &gt; Full Screen على OFF.',
			troubleSidecar:
				'تسجّل كل لقطة الإعدادات التي استُخدمت فيها بالضبط وعدد العينات ومدى انتظام توزّعها، في ملف .json داخل مجلد السجلات بجوار app.log. ويُحتفظ بآخر 20 لقطة — وتُحسب المضاهاة لقطة واحدة — لذا فاللقطة التي تسأل عنها ما تزال موجودة وأنت تسأل عنها.',
		},

		faq: {
			blackShot: 'اللقطة سوداء لكن واجهة iRacing ظاهرة فيها',
			blackShotBody:
				'الالتقاط نفسه نجح: فالواجهة رُسمت، أي أن إطارًا حقيقيًا وصل إلى الأداة. والمفقود هو المشهد ثلاثي الأبعاد، لأن iRacing عرضه أسود. تفعل ذلك بعض الكاميرات غير التقليدية — وكاميرا نظام التعليق هي الأكثر شيوعًا بينها. انتقل إلى كاميرا عادية (المقصورة أو المطاردة أو أي من كاميرات التلفزيون) وصوّر اللحظة نفسها مرة أخرى.',
			blackShotFullscreenBody:
				'أما إذا كانت الصورة سوداء <i>بما في ذلك</i> الواجهة، وتصرفت الكاميرات كلها بالطريقة نفسها، فالسبب مختلف: iRacing في وضع ملء الشاشة الحصري الذي لا يستطيع أي شيء خارج المحاكي التقاطه. اضبط Display &gt; Full Screen على OFF.',

			cameraReset: 'يحرّك iRacing الكاميرا قبل التقاط اللقطة',
			cameraResetBody:
				'هذا هو اختيار اللقطات التلقائي الخاص بـ iRacing، وليس هذه الأداة. فما دام مفعّلًا يستمر iRacing في اختيار الكاميرات لنفسه وسيعود إلى تأطير افتراضي لحظة بدء الالتقاط، فتحصل على غير اللقطة التي أعددتها.',
			cameraResetFixBody:
				'أوقفه من أداة الكاميرات في iRacing (Ctrl+F12)، ضمن <b>Camera &gt; Config &gt; Preferences</b>: مفتاح <b>Shot Selection</b> المسمى <b>Automatic</b>. وعند إيقافه تبقى الكاميرا حيث وضعتها تمامًا، في لقطات الشاشة العادية وفي التعريض الطويل على حد سواء.',

			tripleBands: 'There are vertical bands in my triple-screen shots',
			tripleBandsBody:
				'They are a side effect of two iRacing settings working together: multi-projection (the SMP setting) and bezel correction. On the monitors themselves the picture looks right — the correction exists to line the scene up across the physical frames — but in the captured image the corrected regions show up as vertical bands where one screen meets the next.',
			tripleBandsFixBody:
				"Either change fixes it: set the <b>bezel width</b> to <b>0 mm</b> in iRacing's graphics options, which takes effect immediately, or turn off <b>multi-projection (SMP)</b>, which takes effect after an iRacing restart.",
		},
	},

	update: {
		checking: 'جارٍ التحقق من التحديثات…',
		newVersion: 'إصدار جديد',
		availableBusy:
			'{version} متاح. هناك التقاط قيد التنفيذ — يمكنك تنزيله بعد انتهائه.',
		available: '{version} متاح. انقر لتنزيله.',
		downloading: 'جارٍ تنزيل {version}…',
		downloadingPercent: 'جارٍ تنزيل {version} — {percent}%',
		downloadedBusy:
			'{version} جاهز. هناك التقاط قيد التنفيذ، لذا سيُثبَّت عند إغلاق التطبيق.',
		downloaded: '{version} جاهز. انقر لإعادة التشغيل والتثبيت.',
		failed: 'فشل التحقق من التحديثات: {error}',
		unknownError: 'خطأ غير معروف',
		neverChecked: 'لم يجرِ التحقق من التحديثات بعد.',
		upToDate: 'أنت على أحدث إصدار.',

		alreadyDownloading: 'التحديث قيد التنزيل بالفعل.',
		alreadyDownloaded: 'تم تنزيل التحديث بالفعل.',
		nothingToDownload: 'لا يوجد تحديث لتنزيله.',
		captureInProgress: 'هناك التقاط قيد التنفيذ. أعد المحاولة بعد انتهائه.',
		nothingToInstall: 'لا يوجد تحديث جاهز للتثبيت.',
		captureInProgressInstall:
			'هناك التقاط قيد التنفيذ. وسيُثبَّت التحديث تلقائيًا عند إغلاق التطبيق.',
		devBuildOnly: 'لا يعمل التحقق من التحديثات إلا في نسخة مثبَّتة.',

		installTitle: 'تثبيت التحديث',
		installMessage: 'تثبيت الإصدار {version}؟',
		installFallbackVersion: 'التحديث',
		installDetail:
			'سيُغلق التطبيق ويُفتح من جديد بعد تثبيت التحديث. وإذا اخترت "لاحقًا" فسيُثبَّت تلقائيًا في المرة القادمة التي تغلق فيها التطبيق.',
		installConfirm: 'إعادة التشغيل والتثبيت',
		installLater: 'لاحقًا',
	},

	filenameFields: {
		categories: {
			Track: 'الحلبة',
			Driver: 'السائق',
			Session: 'الجلسة',
			Meta: 'بيانات وصفية',
		},
		track: 'الحلبة',
		trackFull: 'الحلبة (الاسم الكامل)',
		trackCity: 'المدينة',
		trackCountry: 'الدولة',
		trackType: 'نوع الحلبة',
		driver: 'السائق',
		driverAbbrev: 'السائق (اختصار)',
		driverInitials: 'الأحرف الأولى',
		team: 'الفريق',
		carNumber: 'رقم السيارة',
		car: 'السيارة',
		carFull: 'السيارة (الاسم الكامل)',
		carClass: 'فئة السيارة',
		iRating: 'iRating',
		sessionType: 'نوع الجلسة',
		sessionName: 'اسم الجلسة',
		lap: 'اللفة',
		date: 'التاريخ',
		time: 'الوقت',
		datetime: 'التاريخ+الوقت',
		counter: 'العدّاد',
	},

	iracingConfig: {
		projections:
			'عطّل "Render Scene Using 3 Projections" في iRacing (علامة التبويب Display > Monitor) لتجنب الأشرطة الرأسية في لقطات الشاشة',
	},

	graphicsProfiles: {
		title: 'ملفات تعريف الرسومات',
		// The most important sentence here: iRacing writes its graphics settings back
		// over the file when it exits, so a swap made while it is running is undone
		// with no sign anything failed.
		iracingRunning:
			'أغلق iRacing قبل التبديل. فهو يعيد كتابة إعدادات الرسومات عند الخروج، وهو ما سيلغي التغيير.',
		activeHeading: 'الإعدادات الحالية',
		active: {
			clean: 'تطابق ملف التعريف {name}.',
			modified: {
				zero: 'تستند إلى {name}، مع تغيير {count} إعداد منذ ذلك الحين.',
				one: 'تستند إلى {name}، مع تغيير {count} إعداد منذ ذلك الحين.',
				two: 'تستند إلى {name}، مع تغيير {count} إعدادين منذ ذلك الحين.',
				few: 'تستند إلى {name}، مع تغيير {count} إعدادات منذ ذلك الحين.',
				many: 'تستند إلى {name}، مع تغيير {count} إعدادًا منذ ذلك الحين.',
				other: 'تستند إلى {name}، مع تغيير {count} إعداد منذ ذلك الحين.',
			},
			modifiedUnknownCount: 'تستند إلى {name}، مع تغييرات منذ ذلك الحين.',
			unknown: 'لا تطابق أي ملف تعريف محفوظ.',
			missing: 'لم يُعثر على إعدادات رسومات iRacing.',
		},
		badge: {
			active: 'نشط',
			modified: 'معدّل',
		},
		picker: {
			unknown: 'لا يوجد ملف تعريف مطابق',
			missing: 'لا توجد إعدادات',
		},
		empty: {
			title: 'لا توجد ملفات تعريف محفوظة بعد.',
			body: 'احفظ إعدادات iRacing الحالية كملف تعريف، أو استورد ملف .ini موجودًا.',
		},
		invalidProfile: 'ليست إعدادات رسومات',
		warnings: {
			autoCfgIncomplete: 'سيعيد iRacing ضبطه',
		},
		actions: {
			load: 'تحميل',
			overwrite: 'تحديث من الحالي',
			rename: 'إعادة تسمية',
			export: 'تصدير',
			delete: 'حذف',
			save: 'حفظ',
			cancel: 'إلغاء',
			saveCurrent: 'حفظ الحالي باسم…',
			import: 'استيراد…',
			openFolder: 'فتح المجلد',
		},
		prompt: {
			namePlaceholder: 'اسم ملف التعريف',
			deleteConfirm: 'حذف {name}؟',
		},
		feedback: {
			// The restart caveat is part of the success message: the swap only takes
			// effect at iRacing's next launch.
			loaded: 'تم تحميل {name}. شغّل iRacing ليسري مفعوله.',
			saved: 'تم الحفظ باسم {name}.',
			overwritten: 'تم تحديث {name} من الإعدادات الحالية.',
			renamed: 'تمت إعادة التسمية إلى {name}.',
			deleted: 'تم حذف {name}.',
			imported: 'تم الاستيراد باسم {name}.',
			exported: 'تم تصدير {name}.',
		},
		errors: {
			empty: 'أدخل اسمًا لملف التعريف.',
			illegalCharacters:
				'لا يمكن أن يحتوي اسم ملف التعريف على أي من: < > : " / \\ | ? *',
			reservedName: 'هذا الاسم محجوز لدى Windows. اختر اسمًا آخر.',
			trailingDotOrSpace: 'لا يمكن أن ينتهي اسم ملف التعريف بنقطة أو مسافة.',
			tooLong: 'هذا الاسم طويل جدًا.',
			duplicate: 'يوجد بالفعل ملف تعريف بهذا الاسم.',
			profileNotFound: 'لم يعد من الممكن العثور على ملف التعريف هذا.',
			profileExists: 'يوجد بالفعل ملف تعريف بهذا الاسم.',
			duplicateContent:
				'يوجد بالفعل ملف تعريف بهذه الإعدادات نفسها: {name}.',
			noActiveConfig: 'لم يُعثر على إعدادات رسومات iRacing لحفظها.',
			invalidIni: 'هذا الملف ليس إعدادات رسومات iRacing، لذا لم يُستخدم.',
			iracingRunning:
				'أغلق iRacing أولًا — فهو سيستبدل هذا التغيير عند خروجه.',
			ioError: 'تعذّرت كتابة الملف. ولم يتغير شيء.',
		},
	},

	wgc: {
		cursorCaveat:
			'قد يظهر مؤشر الفأرة في اللقطات على هذا الإصدار من Windows. وقد أضاف Windows 10 الإصدار 2004 الخيار الذي يخفيه.',
		addonUnavailable:
			'تعذّر تحميل مكوّن الالتقاط عالي الجودة على هذا النظام.',
		osUnsupported:
			'Windows.Graphics.Capture غير متاح في هذا الإصدار من Windows. فهو يحتاج إلى Windows 10 الإصدار 1903 أو أحدث.',
		// A reason, not a sentence — it is shown as the tail of "التعريض الطويل غير
		// متاح على هذا الجهاز: …".
		nativeCaptureOff: 'الالتقاط عالي الجودة (WGC) معطّل',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing في وضع ملء الشاشة الحصري، لذا ستكون لقطة الشاشة سوداء. في iRacing، اضبط Display > Full Screen على OFF (استخدم Borderless أو Windowed) وحاول مرة أخرى.',
		exclusiveFullscreenUnattributed:
			'هناك تطبيق يعمل في وضع ملء الشاشة الحصري، وهو ما ينتج لقطة سوداء. فإذا كان iRacing في وضع ملء الشاشة، فاضبط Display > Full Screen على OFF (استخدم Borderless أو Windowed) وحاول مرة أخرى.',
		blockedElevated:
			'يمنع Windows التقاط الشاشة طالما أن iRacing Screenshot Tool يعمل بصلاحيات المسؤول. أغلق الأداة، وانقر بزر الماوس الأيمن على iRacing Screenshot Tool.exe ثم اختر خصائص > التوافق، وألغِ تحديد "تشغيل هذا البرنامج بصفته مسؤولًا" (وفعّل أيضًا "تغيير الإعداد لكل المستخدمين")، ثم شغّل الأداة بشكل عادي.',
		blockedDenied:
			'يرفض Windows التقاط الشاشة لهذا التطبيق ({hresult}). قد يكون السبب إعداد خصوصية أو سياسة شركة أو برنامج حماية على هذا الجهاز. وضع التوافق مع ReShade غير متأثر بذلك.',
		reshadeIniMissing:
			'لم يُعثر على إعدادات ReShade في {path}. من الإعدادات، اختر ملف ReShade.ini الخاص بك — يوجد بجانب iRacingSim64DX11.exe مباشرة، داخل المجلد الذي ثُبّت فيه ReShade — أو أوقف تشغيل وضع التوافق مع ReShade.',
		reshadeIniUnreadable:
			'تعذّرت قراءة إعدادات ReShade في {path}. تحقّق من أن لديك إذن قراءة الملف، أو اختر ملف ReShade.ini آخر من الإعدادات.',
		reshadeIniPreset:
			'{path} هو ملف إعداد مسبق (preset) لـ ReShade، وليس إعداداته الخاصة. تحتوي الإعدادات المسبقة على إعدادات التأثيرات فقط ولا تحتوي على مجلد لقطات الشاشة. من الإعدادات، اختر ملف ReShade.ini بدلًا منه — موجود في المجلد نفسه — أو أوقف تشغيل وضع التوافق مع ReShade.',
		reshadeIniNoSavePath:
			'لم يُحدَّد أي مجلد للقطات الشاشة في ReShade ضمن {path}. افتح واجهة ReShade التراكبية داخل iRacing، وانتقل إلى علامة التبويب الإعدادات، وحدّد مسار لقطات الشاشة، ثم أعد المحاولة.',
		reshadeIniNotConfig:
			'{path} ليس ملف إعدادات ReShade. من الإعدادات، اختر ملف ReShade.ini الخاص بك — يوجد بجانب iRacingSim64DX11.exe مباشرة، داخل المجلد الذي ثُبّت فيه ReShade — أو أوقف تشغيل وضع التوافق مع ReShade.',
		unknownError: 'خطأ غير معروف في لقطة الشاشة',
		outputTooSmall: 'ناتج الالتقاط صغير جدًا ({width}x{height})',
		blackFrame:
			'الإطار الملتقط أسود — ربما فشل مصدر الالتقاط (قد يتعذر التقاط المحتوى المسرَّع بواسطة GPU في بعض إعدادات Windows)',
		noSource: 'لم يُعثر على مصدر لالتقاط سطح المكتب للنافذة {windowId}',
		metadataTimeout: 'انتهت مهلة انتظار البيانات الوصفية لفيديو الالتقاط',
		noVideoFrame: 'لم ينتج تدفق الالتقاط أي إطار فيديو',
		dimensionTimeout:
			'انتهت مهلة انتظار أبعاد النافذة {width}x{height}؛ ستتم المتابعة بأبعاد {actualWidth}x{actualHeight}',
	},

	longExposureCapture: {
		busy: 'هناك التقاط قيد التنفيذ بالفعل.',
		needsNativeCapture:
			'يحتاج التعريض الطويل إلى الالتقاط عالي الجودة (WGC). فعّله في الإعدادات لاستخدامه.',
		unavailable: 'التعريض الطويل غير متاح على هذا الجهاز.',
		noTelemetry:
			'يحتاج التعريض الطويل إلى بيانات القياس عن بُعد للإعادة من iRacing. تأكد من أن المحاكي يعمل وأنه داخل جلسة.',
		windowNotFound: 'لم يُعثر على نافذة iRacing.',
		cancelled: 'تم إلغاء الالتقاط.',
		seekTimeout:
			'لم تصل الإعادة إلى الإطار {frame} في الوقت المحدد. وقد تكون ما تزال قيد التحميل.',
		warmUpFellBack:
			'تعذّر إبطاء الإعادة في الوقت المناسب بعد إحماء المؤثرات، فالتُقطت هذه اللقطة من دونه. قد يغيب الدخان والأتربة ودوران العجلات عن بداية الأثر.',
		noPasses: 'يجب أن ينفّذ الالتقاط تمريرة واحدة على الأقل.',
		playbackStalled:
			'لم تبدأ الإعادة بالتشغيل. تأكد من أن iRacing ليس موقوفًا مؤقتًا بواسطة أداة أخرى.',
		exposureTimeout:
			'لم يصل التعريض إلى الإطار {frame} خلال {seconds} ثانية.',
		endedEarly: 'انتهى التعريض قبل بلوغ اللحظة المختارة.',
		noFramesPresented: 'لم يعرض iRacing أي إطارات لالتقاطها.',
		subFrameNoSamples:
			'زمن الغالق هذا أقصر من إطار إعادة واحد، ولم يعرض iRacing أي إطار داخله. جرّب سرعة تشغيل أبطأ، أو زمن الغالق الأبطأ التالي.',
		noSamples:
			'لم تُجمع أي إطارات. وربما توقف iRacing عن العرض أثناء التعريض.',
		blankCapture:
			'كان كل إطار ملتقط أسود، فلا توجد صورة لحفظها. تأكد من أن iRacing في وضع النافذة أو بلا حدود بدلًا من وضع ملء الشاشة الحصري، وأن لديه ذاكرة فيديو متاحة عند هذه الدقة — وأسرع ما يمكن تجربته هو خفض دقة الالتقاط.',
		frozenCapture:
			'عرض iRacing {samples} إطارًا أثناء التعريض لكنها كانت متطابقة كلها، لذا فهذه الصورة ثابتة وليست تعريضًا طويلًا. لم يعرض iRacing شيئًا جديدًا بينما كانت الإعادة تعمل.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'لم يُرجع GPU أي صورة.',
		bracketShortfall:
			'طلبت المضاهاة {asked} درجات لكن عاد منها {returned} — إما أن حل البقية أخفق، أو أن هذه النسخة من مكوّن الالتقاط أقدم من المضاهاة.',
	},

	validation: {
		windowBeforeStart:
			'يحتاج التعريض إلى {frames} إطار إعادة قبل اللحظة المختارة، لكنها لا تبعد سوى {anchor} إطار عن بداية الإعادة. اختر لحظة لاحقة أو غالقًا أسرع.',
		pastEnd: 'اللحظة المختارة تتجاوز نهاية الإعادة.',
		sessionChanged:
			'انتقلت الإعادة إلى جلسة مختلفة منذ إعداد هذه اللقطة. أعد اختيار اللحظة.',
		singleSampleMultiPass:
			'زمن الغالق هذا قصير بما يكفي ليقع داخله إطار واحد تقريبًا في كل تمريرة، لذا ستجمع {passes} تمريرة نحو {passes} عينة. وسرعة تشغيل أبطأ أو غالق أبطأ يمنحان أكثر من ذلك بكثير.',
		warmUpShortened:
			'هذه اللحظة قريبة من بداية الإعادة، لذا قُصِّر إحماء المؤثرات إلى {seconds} ث. قد يغيب الدخان والأتربة ودوران العجلات عن بداية الأثر.',
		singleSample:
			'زمن الغالق هذا قصير بما يكفي ليقع داخله إطار واحد فقط، لذا لن يكون في النتيجة أي ضبابية حركة. وسرعة تشغيل أبطأ أو غالق أبطأ يمنحان عينات أكثر.',
		shortOfTarget:
			'حتى عند سرعة 1/{divisor} يبلغ هذا التعريض نحو {samples} عينة، أي أقل من {target} المطلوبة. استخدم زمن غالق أطول للحصول على المزيد.',
		longCaptureEscalate:
			'يشغّل هذا الالتقاط الإعادة بسرعة 1/{divisor} لمدة {duration} تقريبًا من الزمن الحقيقي{passSuffix}، ولا يمكن تسريعه بعد أن يبدأ. {advice}',
		longCaptureWarn:
			'سيستغرق هذا الالتقاط نحو {duration} من الزمن الحقيقي بسرعة تشغيل 1/{divisor}{passSuffix}.',
		passSuffix: '، موزعة على {passes} تمريرة على اللحظة نفسها',
		adviceFewerPasses: 'تمريرات أقل تنتهي أسرع بعينات أقل.',
		adviceFasterPlayback: 'سرعة تشغيل أعلى تنتهي أسرع بعينات أقل.',
		pastLogCap:
			'يُتوقع أن يجمع هذا الالتقاط نحو {samples} عينة عبر {passes} تمريرة، متجاوزًا {cap} التي يسعها سجل التشخيص. ولا تتأثر الصورة بذلك — إنما ستصف أرقام الانتظام والفجوات الجزء الأول من الالتقاط فقط.',
	},

	duration: {
		zero: '0 ثانية',
		seconds: {
			zero: '{count} ثانية',
			one: '{count} ثانية',
			two: '{count} ثانيتان',
			few: '{count} ثوانٍ',
			many: '{count} ثانية',
			other: '{count} ثانية',
		},
		minutes: {
			zero: '{count} دقيقة',
			one: '{count} دقيقة',
			two: '{count} دقيقتان',
			few: '{count} دقائق',
			many: '{count} دقيقة',
			other: '{count} دقيقة',
		},
		minutesSeconds: '{minutes} د {seconds} ث',
	},

	// The navigation rail’s tooltips.
	nav: {
		home: 'لقطات الشاشة',
	},
};

export default ar;
