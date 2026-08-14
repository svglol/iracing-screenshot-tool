// Polish. Translated from en.ts — see that file's header before editing.
//
// NOTE ON PLURALS. Polish has four CLDR categories and this catalogue uses them:
//   one   n = 1                      → 1 przebieg
//   few   n % 10 = 2..4, n % 100 ∉ 12..14 → 2 przebiegi
//   many  everything else integral    → 5 przebiegów
//   other fractional counts           → same form as `many` here
// Dropping `few` would render "2 przebiegów", which is simply wrong Polish — the
// selector uses Intl.PluralRules, so all four forms are actually reachable.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.

import type { Catalog } from './index';

const pl: Catalog = {
	notice: {
		danger: 'Problemy',
		warning: 'Warto wiedzieć',
		info: 'Uwagi',
	},

	promo: {
		greeting: 'Dziękujemy za korzystanie z iRacing Screenshot Tool!',
		signature: 'Stworzone i rozwijane przez AR Media Solutions.',
	},

	changelog: {
		title: 'Lista zmian',
		untitledRelease: 'Wydanie',
	},

	gallery: {
		menu: {
			openExternally: 'Otwórz w innej aplikacji',
			openFolder: 'Otwórz folder',
			copy: 'Kopiuj',
			delete: 'Usuń',
		},
		copiedToClipboard: 'Skopiowano {name} do schowka',
	},

	sidebar: {
		resolution: 'Rozdzielczość',
		width: 'Szerokość',
		height: 'Wysokość',
		output: 'Wynik:',
		cropWatermark: 'Przytnij znak wodny',
		keepAspectRatio: 'Zachowaj proporcje',
		screenshot: 'Zrzut ekranu',
		custom: 'Własna',
		vramStatus: '{adapter}{free} wolne z {total}',
		savedSuccessfully: 'Zapisano {name}',
		screenshotFailed: 'Nie udało się wykonać zrzutu: {message}',
		errorLogPrefix: 'Dziennik: ',
		notices: {
			exclusiveFullscreen:
				'iRacing działa w wyłącznym trybie pełnoekranowym — zrzuty będą czarne. W iRacing ustaw Display > Full Screen na OFF (Borderless lub Windowed), aby umożliwić przechwytywanie.',
			vramRisk:
				'{resolution} wymaga około {needed} więcej pamięci VRAM, a wolne jest tylko {free} — iRacing prawdopodobnie wyczerpie pamięć i się zawiesi.',
			vramCaution:
				'{resolution} zostawia niewielki zapas pamięci VRAM ({free} wolne) i może się zawiesić przy wymagających kombinacjach toru i samochodu.',
			switchResolution: 'Przełącz na {resolution}',
			vramStatic:
				'Wysokie rozdzielczości mogą spowodować awarię iRacing, jeśli zabraknie pamięci VRAM. Niektóre kombinacje toru i samochodu wymagają jej więcej.',
			reshade:
				'Po naciśnięciu przycisku zrzutu w iRacing Screenshot Tool trzeba jeszcze użyć skrótu klawiszowego zrzutu ekranu z ReShade.',
			crop: 'Przycięcie znaku wodnego nieznacznie przybliża końcowy obraz. Obszary przy krawędziach ekranu zostaną obcięte.',
			aspectRatio:
				'„Zachowaj proporcje” dopasowuje wysokość zrzutu do proporcji Twojego monitora (np. 21:9 ultrapanoramicznego) zamiast domyślnych 16:9. Wybrana rozdzielczość wyznacza szerokość.',
		},
	},

	settings: {
		title: 'Ustawienia',
		version: 'Wersja - {version}',
		changelog: 'Lista zmian',
		openLogsFolder: 'Otwórz folder dzienników',
		checkForUpdates: 'Sprawdź aktualizacje',
		updateCheckFailed: 'Sprawdzanie aktualizacji nie powiodło się: {message}',

		language: 'Język',
		languageDescription:
			'Język używany w całej aplikacji. Wykrywany z systemu Windows przy pierwszym uruchomieniu.',

		screenshotFolder: 'Folder zrzutów ekranu',
		selectFolder: 'Wybierz folder',
		screenshotKeybind: 'Skrót klawiszowy zrzutu',
		editBind: 'Zmień skrót',

		customFilenameFormat: 'Własny format nazwy pliku',
		customFilenameFormatDescription:
			'Użyj własnego wzorca zamiast domyślnego ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'Kliknij pola, aby dodać je do formatu. Separatory (-, _ itp.) wpisuj bezpośrednio.',
		reset: 'Przywróć',
		preview: 'Podgląd:',

		outputFormat: 'Format wyjściowy',
		formatJpeg: 'JPEG (najwyższa jakość)',
		formatPng: 'PNG (bezstratny)',
		formatWebp: 'WebP (jakość 95%)',

		disableTooltips: 'Ukryj podpowiedzi',
		disableTooltipsDescription: 'Zostaw mnie w spokoju, wiem, co robię',

		cropTopLeft: 'Preferuj przycięcie znaku wodnego z lewego górnego rogu',
		cropTopLeftDescription:
			'Przycina tylko prawy dolny róg (3%). Gdy opcja jest wyłączona, zrzut jest przycinany równomiernie ze wszystkich stron (łącznie 6%), co daje wyśrodkowany rezultat.',

		manualWindowRestore: 'Ręczne przywracanie okna',
		manualWindowRestoreDescription:
			'Zastępuje automatyczne przywracanie okna własną pozycją i rozmiarem. Przydatne przy monitorach ultrapanoramicznych lub Nvidia Surround.',
		left: 'Lewo',
		top: 'Góra',
		width: 'Szerokość',
		height: 'Wysokość',
		restoreNow: 'Przywróć teraz',

		nativeCapture: 'Przechwytywanie wysokiej jakości (WGC)',
		nativeCaptureDescription:
			'Przechwytuje prawdziwy kolor bez podpróbkowania przez Windows.Graphics.Capture zamiast domyślnego potoku (który podpróbkowuje kolor). W razie niepowodzenia automatycznie wraca do metody zapasowej.',
		nativeCaptureUnavailable:
			'Niedostępne w tym systemie — przechwytywanie wysokiej jakości nie może tu działać.',
		nativeCaptureUnverified:
			'Windows zgłasza obsługę, ale testowe przechwycenie nie powróciło. Jeśli błąd się powtórzy, przechwytywanie automatycznie przejdzie na metodę zapasową.',

		reshade: 'Tryb zgodności z ReShade',
		reshadeDescription:
			'Korzystając z ReShade, musisz najpierw użyć skrótu iRacing Screenshot Tool lub nacisnąć przycisk, a następnie — gdy okno iRacing zmieni rozmiar — użyć skrótu zrzutu ekranu z ReShade.',
		reshadeIni: 'Plik INI ReShade',
		selectFile: 'Wybierz plik',
	},

	longExposure: {
		title: 'Długie naświetlanie',
		shutter: 'Czas migawki',
		playbackSpeed: 'Prędkość odtwarzania',
		playbackAuto: 'Automatycznie (z docelowej liczby próbek)',
		playbackRealTime: '1x (czas rzeczywisty)',
		targetSamples: 'Docelowa liczba próbek',
		advanced: 'Zaawansowane',
		defaultsSummary: 'wartości domyślne: {count}',

		weighting: 'Ważenie',
		weightingBox: 'Box (równomierne)',
		weightingLinear: 'Liniowe (ostre na końcu)',
		weightingEase: 'Ease (ostrzejszy początek, długi ogon)',

		interpolation: 'Interpolacja klatek',
		interpolationOff: 'Wyłączona',
		interpolation2: '2× (jedna klatka pośrednia)',
		interpolation4: '4× (trzy klatki pośrednie)',
		interpolation8: '8× (siedem klatek pośrednich)',

		passes: 'Przebiegi',
		passes1: '1 (pojedynczy przebieg)',
		passes2: '2× — dwukrotnie dłuższe oczekiwanie',
		passes4: '4× — czterokrotnie dłuższe oczekiwanie',
		passes8: '8× — ośmiokrotnie dłuższe oczekiwanie',

		bracket: 'Bracketing czasów migawki',
		highlightRecovery: 'Odzyskiwanie świateł (EV)',

		cancel: 'Anuluj',
		saved: 'Zapisano długie naświetlanie — próbek: {count}',
		failed: 'Długie naświetlanie nie powiodło się',

		modified: {
			weighting_linear: 'liniowe',
			weighting_ease: 'ease',
			interpolation: 'interpolacja {factor}×',
			passes: {
				one: '{count} przebieg',
				few: '{count} przebiegi',
				many: '{count} przebiegów',
				other: '{count} przebiegów',
			},
			bracketed: 'bracketing',
			recovery: 'odzyskiwanie {stops} EV',
		},

		progress: {
			working: 'Pracuję…',
			seeking: 'Wyszukiwanie…{pass}',
			accumulating: 'Naświetlanie… próbek: {count}{pass}',
			resolving: 'Wywoływanie…',
			restoring: 'Przywracanie powtórki…',
			pass: ' (przebieg {current} z {total})',
		},

		notices: {
			needsNativeCapture:
				'Długie naświetlanie wymaga przechwytywania wysokiej jakości (WGC), które jest obecnie wyłączone. Włącz je w ustawieniach, aby korzystać z długiego naświetlania.',
			unavailableWithReason:
				'Długie naświetlanie jest niedostępne na tym komputerze: {reason}',
			unavailable: 'Długie naświetlanie jest niedostępne na tym komputerze.',
			interpolationCost:
				'Interpolacja wymyśla klatki pomiędzy prawdziwymi, aby wygładzić smugę. Kosztuje czas GPU na każdą klatkę, więc porównaj liczbę prawdziwych próbek zapisanego ujęcia z tym samym ujęciem bez interpolacji — jeśli ta liczba spada, kupuje ona wymyślone próbki za prawdziwe.',
			passesAndInterpolation:
				'Przebiegi i interpolacja rywalizują o ten sam budżet na klatkę. Gdy oba są włączone, każdy przebieg przechwytuje mniej prawdziwych klatek — wyłączenie interpolacji zwykle daje lepsze ujęcie przy tym samym czasie oczekiwania.',
			passes:
				'Każdy przebieg odtwarza ten sam moment i wyłapuje klatki pominięte przez pozostałe, dzięki czemu smuga staje się gładsza, a nie jaśniejsza. Najlepiej sprawdza się przy krótkich czasach migawki, gdzie pojedynczy przebieg zbiera zaledwie garść próbek.',
			interpolationUnsupported:
				'Interpolacja klatek wymaga karty NVIDIA Turing lub nowszej{adapter}. Cała reszta długiego naświetlania działa normalnie.',
			interpolationAdapter: ' (to przechwytywanie działa na {adapter})',
			reshade:
				'Długie naświetlanie przechwytuje natywnie i nie korzysta z ReShade, więc efekty ReShade nie pojawią się w wyniku.',
		},
	},

	help: {
		title: 'Pomoc',
		sections: 'Sekcje pomocy',
		tabGeneral: 'Ogólne',
		tabLongExposure: 'Długie naświetlanie',
		tabFaq: 'FAQ',

		general: {
			iracingSettings: 'Ustawienia iRacing',
			borderless: 'iRacing musi działać w trybie Windowed Borderless',
			vram: 'Do zrzutów w rozdzielczości 8K i wyższej zalecane jest co najmniej 8 GB pamięci VRAM',
			newerContent: 'Nowsze tory i samochody wymagają więcej pamięci VRAM',
			shrinkUi:
				'Jeśli korzystasz z opcji przycinania znaku wodnego, przed zrzutem zmniejsz interfejs do minimum — skrót „Control+PageDown” go pomniejsza. Jeśli to nie działa, może być konieczne zresetowanie powiększenia interfejsu w ustawieniach iRacing.',

			screenshotFolder: 'Folder zrzutów ekranu',
			screenshotFolderBody:
				'Zrzuty są domyślnie zapisywane w „C:\\Users\\user\\Pictures\\Screenshots”; można to zmienić w ustawieniach.',

			screenshotHotkey: 'Skrót klawiszowy zrzutu',
			screenshotHotkeyBody:
				'Domyślnie „Control + PrintScreen” wykonuje zrzut z bieżącymi ustawieniami; skrót można zmienić w ustawieniach.',

			issues: 'Problemy',
			issuesBody: 'W razie problemów zgłoś je na',
			discord: 'Discordzie',

			instructions: 'Instrukcja',
			step1: 'iRacing <b>musi</b> działać w trybie Windowed Borderless',
			step2: 'Uruchom iRacing i ustaw kamerę w pozycji, z której chcesz wykonać zrzut',
			step3: 'Wybierz żądaną rozdzielczość (wypróbuj niższe rozdzielczości, zanim przejdziesz do 8K)',
			step4: 'Zdecyduj, czy chcesz przyciąć znak wodny iRacing; jeśli tak, najpierw zmniejsz interfejs iRacing do najmniejszego rozmiaru skrótem „Control + PageDown”',
			step5: 'Naciśnij przycisk zrzutu lub użyj skrótu „Control + PrintScreen”, aby wykonać zrzuty',
			step6: 'W zależności od wybranej rozdzielczości może to potrwać kilka sekund; gdy okno iRacing wróci do normalnego rozmiaru, operacja jest zakończona',
			step7: 'Twój zrzut zostanie zapisany w „C:\\Users\\{User}\\Pictures\\Screenshots”',
		},

		longExposure: {
			whatItDoes: 'Co to robi',
			whatItDoesBody:
				'Długie naświetlanie łączy wiele klatek powtórki w jeden obraz, tak jak pozostawiona otwarta migawka aparatu: to, co nieruchome, pozostaje ostre, a to, co się porusza, zostawia smugę. Narzędzie samo steruje powtórką, przechwytuje każdą klatkę wyświetlaną przez symulator i sumuje je na GPU.',

			shutter: 'Czas migawki',
			shutterBody:
				'Jak długo trwa naświetlanie <i>w czasie powtórki</i>, od ułamka jednej klatki powtórki do dziesięciu sekund. To ustawienie decyduje o długości smug. Dłuższe czasy migawki zbierają też więcej klatek, więc mniej potrzebują wszystkiego poniżej; najkrótsze wartości obejmują pojedynczą klatkę powtórki i zbierają zaledwie garść próbek.',

			playback: 'Prędkość odtwarzania',
			playbackBody:
				'Podczas przechwytywania naświetlenia powtórka jest odtwarzana w zwolnionym tempie, dzięki czemu symulator wyświetla więcej klatek na sekundę czasu powtórki, a złożenie otrzymuje więcej próbek. 1/16 zbiera mniej więcej szesnaście razy więcej klatek niż czas rzeczywisty — i trwa szesnaście razy dłużej w czasie rzeczywistym. To główny kompromis w tym panelu: cierpliwość za gładkość.',
			playbackAutoBody:
				'„Automatycznie (z docelowej liczby próbek)” dobiera prędkość na podstawie <b>docelowej liczby próbek</b>: narzędzie wyznacza najszybsze odtwarzanie, które nadal osiąga żądaną liczbę. Ustaw konkretną prędkość, jeśli wolisz ograniczyć czas oczekiwania.',

			weighting: 'Ważenie',
			weightingBody:
				'Jak bardzo każda przechwycona klatka wpływa na wynik. <b>Box</b> waży wszystkie jednakowo, dając równomierną smugę. <b>Liniowe</b> narasta ku końcowi okna, więc obiekt jest najostrzejszy tam, gdzie zakończył ruch, i zanika wzdłuż swojej drogi. <b>Ease</b> to ta sama idea z ostrzejszym początkiem i dłuższym ogonem.',

			interpolation: 'Interpolacja klatek',
			interpolationBody:
				'Wymyśla dodatkowe klatki pomiędzy prawdziwymi, korzystając z układu przepływu optycznego GPU, i wypełnia luki w smudze. Wymaga karty NVIDIA Turing lub nowszej, a na sprzęcie, który tego nie obsługuje, jest całkowicie ukryta.',
			interpolationCostBody:
				'Nie jest darmowa: kosztuje czas GPU przy każdej przechwyconej klatce, a budżet to jedna klatka iRacing. Jeśli nie nadąża, zaczyna gubić <i>prawdziwe</i> klatki, by wytworzyć syntetyczne, co jest stratą netto — smuga wychodzi krótsza i bardziej poszarpana. Koszt rośnie z liczbą megapikseli pomnożoną przez współczynnik, więc to, co jest wygodne przy 2560×1440, nie sprawdzi się w 8K. Aby to sprawdzić, wykonaj to samo ujęcie dwa razy, z interpolacją i bez, i porównaj liczbę prawdziwych próbek; aplikacja ostrzeże Cię też po fakcie, jeśli ujęcie okaże się niepełne.',

			passes: 'Przebiegi',
			passesBody:
				'Odwiedza ten sam moment wielokrotnie, sumując wszystko w jeden obraz. Każdy przebieg wyłapuje klatki, które inne przypadkiem pominęły, więc smuga staje się gładsza — nie jaśniejsza, ponieważ wynik jest normalizowany według ilości światła, które faktycznie padło na każdy piksel.',
			passesTradeBody:
				'Przebiegi kupują to samo co interpolacja, ale inną walutą: czasem rzeczywistym zamiast czasu GPU. Osiem przebiegów trwa mniej więcej osiem razy dłużej, ale nigdy nie może Cię kosztować prawdziwych klatek. To czyni je właściwą dźwignią przy wysokich rozdzielczościach, gdzie interpolacja nie nadąża, oraz przy krótkich czasach migawki, gdzie pojedynczy przebieg zbiera bardzo mało próbek. Używanie obu naraz to zwykle najgorsze z rozwiązań — rywalizują o ten sam budżet na klatkę.',

			bracket: 'Bracketing czasów migawki',
			bracketBody:
				'Z jednego przechwycenia tworzy po jednym obrazie dla każdego czasu migawki równego wybranemu lub krótszego. Ujęcie przy 1/60 daje także 1/125, 1/250, 1/500 i 1/1000 — ten sam moment z coraz krótszymi smugami — dzięki czemu wybierasz efekt później, zamiast zgadywać i powtarzać ujęcie.',
			bracketCostBody:
				'Nie kosztuje to praktycznie żadnego dodatkowego czasu. Każdy czas kończy się na tej samej klatce i różni się tylko tym, jak daleko sięga wstecz, więc krótsza migawka to po prostu końcówka klatek, które i tak przelatują — wszystkie są wypełniane z jednego przebiegu powtórki.',
			bracketMemoryBody:
				'Kosztuje natomiast pamięć. Każdy czas potrzebuje własnego akumulatora w pełnej rozdzielczości, więc jedenaście czasów wymaga jedenastokrotnie więcej pamięci karty niż jeden, co przy 8K przekracza możliwości większości kart. Przechwytywanie sprawdza to przed startem i odmawia, zamiast doprowadzić do awarii iRacing; jeśli bracketing zostanie odrzucony, obniż rozdzielczość albo wybierz krótszy czas migawki — co daje też krótszą drabinkę.',
			bracketNamingBody:
				'Wybrany przez Ciebie czas jest zapisywany pod zwykłą nazwą i to on pojawia się w galerii; pozostałe leżą obok, z czasem migawki w nazwie pliku.',

			highlights: 'Odzyskiwanie świateł',
			highlightsBody:
				'Wzmacnia światła bliskie przepaleniu, zanim klatki zostaną zsumowane, a na końcu cofa to wzmocnienie. iRacing przekazuje obraz już po mapowaniu tonalnym, więc reflektor i biała ściana docierają z tą samą wartością; uśrednienie tego sprawia, że jasne światło przemieszczające się przez część naświetlenia wygląda jak szara smuga zamiast jasnego śladu. Ta opcja przywraca nieliniowość tam, gdzie ma ją prawdziwa matryca. Mierzone w działkach EV; 0 oznacza wyłączenie i nie zmienia zupełnie nic.',

			whatItSaves: 'Co zapisuje',
			whatItSavesBody:
				'Rozmiar, przycinanie znaku wodnego i format pliku podlegają tym samym ustawieniom co zwykły zrzut ekranu — opcjom Rozdzielczość i Przytnij znak wodny powyżej oraz formatowi wyjściowemu w ustawieniach. Wiersz „Wynik” na górze panelu bocznego pokazuje dokładnie to, co otrzymasz.',
			whatItSavesPngBody:
				'Wybór PNG zapisuje prawdziwy 16-bitowy master, co ma sens, jeśli zamierzasz później korygować kolory, oraz 8-bitowy podgląd do galerii. Zapis jest też znacznie wolniejszy przy wysokich rozdzielczościach — 16-bitowy PNG o wielkości 33 megapikseli zajmuje około dziesięciu sekund, podczas gdy ta sama klatka w JPEG poniżej sekundy.',

			troubleshooting: 'Jeśli wynik wygląda źle',
			troubleGhosts:
				'<b>Osobne duchy zamiast gładkiej smugi</b> — zbyt mało próbek. Użyj wolniejszej prędkości odtwarzania, większej liczby przebiegów albo niższej rozdzielczości.',
			troubleShutter:
				'<b>Nie wiesz, jakiego czasu migawki chciałeś</b> — włącz bracketing czasów migawki i zdecyduj później, przy tym samym czasie oczekiwania.',
			troubleHighlights:
				'<b>Przepalone lub płaskie światła</b> — spróbuj od 3 do 5 działek odzyskiwania świateł.',
			troubleBlack:
				'<b>Czarny obraz</b> — iRacing działa w wyłącznym trybie pełnoekranowym. Ustaw Display &gt; Full Screen na OFF.',
			troubleSidecar:
				'Każde ujęcie zapisuje dokładnie użyte ustawienia, liczbę próbek i to, jak równomiernie były rozłożone, w pliku .json w folderze dzienników obok app.log. Przechowywanych jest ostatnich 20 ujęć — bracketing liczy się jako jedno — więc ujęcie, o które pytasz, wciąż tam jest, gdy o nie pytasz.',
		},

		faq: {
			blackShot: 'Ujęcie jest czarne, ale widać na nim interfejs iRacinga',
			blackShotBody:
				'Samo przechwytywanie zadziałało: interfejs się narysował, więc do narzędzia dotarła prawdziwa klatka. Brakuje sceny 3D, bo iRacing wyrenderował ją na czarno. Robi tak kilka mniej typowych kamer — najczęściej kamera zawieszenia. Przełącz się na zwykłą kamerę (kokpit, pościgowa lub jedna z kamer TV) i uchwyć ten sam moment ponownie.',
			blackShotFullscreenBody:
				'Jeśli obraz jest czarny <i>razem z</i> interfejsem, a wszystkie kamery zachowują się tak samo, przyczyna jest inna: iRacing działa w wyłącznym trybie pełnoekranowym, którego nic spoza symulatora nie przechwyci. Ustaw Display &gt; Full Screen na OFF.',

			cameraReset:
				'iRacing przestawia mi kamerę tuż przed zrobieniem ujęcia',
			cameraResetBody:
				'To własny automatyczny dobór ujęć iRacinga, a nie to narzędzie. Dopóki jest włączony, iRacing sam wybiera kamery i w chwili rozpoczęcia przechwytywania wraca do domyślnego kadru, więc zamiast przygotowanego ujęcia dostajesz inne.',
			cameraResetFixBody:
				'Wyłącz go w narzędziu kamer iRacinga (Ctrl+F12), w <b>Camera &gt; Config &gt; Preferences</b>: przełącznik <b>Shot Selection</b> z etykietą <b>Automatic</b>. Gdy jest wyłączony, kamera zostaje dokładnie tam, gdzie ją ustawisz — zarówno przy zwykłych zrzutach, jak i przy długim naświetlaniu.',
		},
	},

	update: {
		checking: 'Sprawdzanie aktualizacji…',
		newVersion: 'Nowa wersja',
		availableBusy:
			'Dostępna jest wersja {version}. Trwa przechwytywanie — będzie można ją pobrać, gdy się zakończy.',
		available: 'Dostępna jest wersja {version}. Kliknij, aby ją pobrać.',
		downloading: 'Pobieranie wersji {version}…',
		downloadingPercent: 'Pobieranie wersji {version} — {percent}%',
		downloadedBusy:
			'Wersja {version} jest gotowa. Trwa przechwytywanie, więc zostanie zainstalowana po zamknięciu aplikacji.',
		downloaded:
			'Wersja {version} jest gotowa. Kliknij, aby uruchomić ponownie i zainstalować.',
		failed: 'Sprawdzanie aktualizacji nie powiodło się: {error}',
		unknownError: 'nieznany błąd',
		neverChecked:
			'Nie sprawdzano jeszcze aktualizacji (masz wersję v{version}).',
		upToDate: 'Masz najnowszą wersję (v{version}).',

		alreadyDownloading: 'Aktualizacja jest już pobierana.',
		alreadyDownloaded: 'Aktualizacja została już pobrana.',
		nothingToDownload: 'Nie ma aktualizacji do pobrania.',
		captureInProgress:
			'Trwa przechwytywanie. Spróbuj ponownie, gdy się zakończy.',
		nothingToInstall: 'Żadna aktualizacja nie czeka na instalację.',
		captureInProgressInstall:
			'Trwa przechwytywanie. Aktualizacja zainstaluje się sama po zamknięciu aplikacji.',
		devBuildOnly:
			'Sprawdzanie aktualizacji działa tylko w zainstalowanej wersji.',

		installTitle: 'Zainstaluj aktualizację',
		installMessage: 'Zainstalować wersję {version}?',
		installFallbackVersion: 'aktualizację',
		installDetail:
			'Aplikacja zostanie zamknięta i otwarta ponownie po zainstalowaniu aktualizacji. Jeśli wybierzesz „Później”, zainstaluje się sama przy następnym zamknięciu aplikacji.',
		installConfirm: 'Uruchom ponownie i zainstaluj',
		installLater: 'Później',
	},

	filenameFields: {
		categories: {
			Track: 'Tor',
			Driver: 'Kierowca',
			Session: 'Sesja',
			Meta: 'Meta',
		},
		track: 'Tor',
		trackFull: 'Tor (pełna nazwa)',
		trackCity: 'Miasto',
		trackCountry: 'Kraj',
		trackType: 'Typ toru',
		driver: 'Kierowca',
		driverAbbrev: 'Kierowca (skrót)',
		driverInitials: 'Inicjały',
		team: 'Zespół',
		carNumber: 'Nr auta',
		car: 'Samochód',
		carFull: 'Samochód (pełna nazwa)',
		carClass: 'Klasa samochodu',
		iRating: 'iRating',
		sessionType: 'Typ sesji',
		sessionName: 'Nazwa sesji',
		lap: 'Okrążenie',
		date: 'Data',
		time: 'Godzina',
		datetime: 'Data+godzina',
		counter: 'Licznik',
	},

	iracingConfig: {
		projections:
			'Wyłącz „Render Scene Using 3 Projections” w iRacing (karta Display > Monitor), aby uniknąć pionowych pasów na zrzutach',
	},

	graphicsProfiles: {
		title: 'Profile graficzne',
		description:
			'Zapisuj konfiguracje grafiki iRacing i przełączaj się między nimi — zestaw na trzy monitory do ścigania i na jeden do zrzutów ekranu.',
		iracingRunning:
			'Zamknij iRacing przed przełączeniem. Przy zamykaniu zapisuje swoją konfigurację grafiki z powrotem, co cofnęłoby zmianę.',
		activeHeading: 'Bieżąca konfiguracja',
		active: {
			clean: 'Odpowiada profilowi {name}.',
			modified: {
				one: 'Oparta na profilu {name}, od tego czasu zmieniono {count} ustawienie.',
				few: 'Oparta na profilu {name}, od tego czasu zmieniono {count} ustawienia.',
				many: 'Oparta na profilu {name}, od tego czasu zmieniono {count} ustawień.',
				other: 'Oparta na profilu {name}, od tego czasu zmieniono {count} ustawienia.',
			},
			modifiedUnknownCount:
				'Oparta na profilu {name}, od tego czasu zmieniona.',
			unknown: 'Nie odpowiada żadnemu zapisanemu profilowi.',
			missing: 'Nie znaleziono konfiguracji grafiki iRacing.',
		},
		badge: {
			active: 'Aktywny',
			modified: 'Zmieniony',
		},
		empty: {
			title: 'Nie zapisano jeszcze żadnych profili.',
			body: 'Zapisz bieżącą konfigurację iRacing jako profil albo zaimportuj istniejący plik .ini.',
		},
		invalidProfile: 'To nie konfiguracja grafiki',
		warnings: {
			autoCfgIncomplete: 'Zostanie zresetowany przez iRacing',
		},
		actions: {
			apply: 'Zastosuj',
			overwrite: 'Zaktualizuj z bieżącej',
			rename: 'Zmień nazwę',
			export: 'Eksportuj',
			delete: 'Usuń',
			save: 'Zapisz',
			cancel: 'Anuluj',
			saveCurrent: 'Zapisz bieżącą jako…',
			import: 'Importuj…',
			openFolder: 'Otwórz folder',
		},
		prompt: {
			namePlaceholder: 'Nazwa profilu',
			deleteConfirm: 'Usunąć {name}?',
		},
		feedback: {
			applied: 'Zastosowano {name}. Uruchom iRacing, aby zmiana zadziałała.',
			saved: 'Zapisano jako {name}.',
			overwritten: 'Zaktualizowano {name} z bieżącej konfiguracji.',
			renamed: 'Zmieniono nazwę na {name}.',
			deleted: 'Usunięto {name}.',
			imported: 'Zaimportowano jako {name}.',
			exported: 'Wyeksportowano {name}.',
		},
		errors: {
			empty: 'Podaj nazwę profilu.',
			illegalCharacters:
				'Nazwa profilu nie może zawierać żadnego z tych znaków: < > : " / \\ | ? *',
			reservedName:
				'Ta nazwa jest zarezerwowana przez Windows. Wybierz inną.',
			trailingDotOrSpace:
				'Nazwa profilu nie może kończyć się kropką ani spacją.',
			tooLong: 'Ta nazwa jest za długa.',
			duplicate: 'Profil o tej nazwie już istnieje.',
			profileNotFound: 'Nie udało się już odnaleźć tego profilu.',
			profileExists: 'Profil o tej nazwie już istnieje.',
			duplicateContent:
				'Profil o dokładnie tych ustawieniach już istnieje: {name}.',
			noActiveConfig:
				'Nie znaleziono konfiguracji grafiki iRacing do zapisania.',
			invalidIni:
				'Ten plik nie jest konfiguracją grafiki iRacing, więc nie został użyty.',
			iracingRunning:
				'Najpierw zamknij iRacing — przy zamykaniu nadpisałby tę zmianę.',
			ioError: 'Nie udało się zapisać pliku. Nic nie zostało zmienione.',
		},
	},

	wgc: {
		cursorCaveat:
			'W tej wersji systemu Windows kursor myszy może pojawiać się na zrzutach. Windows 10 w wersji 2004 dodał ustawienie, które go ukrywa.',
		addonUnavailable:
			'Nie udało się załadować składnika przechwytywania wysokiej jakości w tym systemie.',
		osUnsupported:
			'Windows.Graphics.Capture nie jest dostępne w tej wersji systemu Windows. Wymaga Windows 10 w wersji 1903 lub nowszej.',
		nativeCaptureOff: 'Przechwytywanie wysokiej jakości (WGC) jest wyłączone',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing działa w wyłącznym trybie pełnoekranowym, więc zrzut byłby czarny. W iRacing ustaw Display > Full Screen na OFF (użyj Borderless lub Windowed) i spróbuj ponownie.',
		exclusiveFullscreenUnattributed:
			'Jakaś aplikacja działa w wyłącznym trybie pełnoekranowym, co daje czarny zrzut. Jeśli iRacing jest w trybie pełnoekranowym, ustaw Display > Full Screen na OFF (użyj Borderless lub Windowed) i spróbuj ponownie.',
		unknownError: 'Nieznany błąd zrzutu ekranu',
		outputTooSmall: 'Przechwycony obraz jest za mały ({width}x{height})',
		blackFrame:
			'Przechwycona klatka jest czarna — źródło przechwytywania mogło zawieść (w niektórych konfiguracjach Windows treści akcelerowane przez GPU nie dają się przechwycić)',
		noSource:
			'Nie znaleziono źródła przechwytywania pulpitu dla okna {windowId}',
		metadataTimeout:
			'Przekroczono czas oczekiwania na metadane wideo przechwytywania',
		noVideoFrame:
			'Strumień przechwytywania nie dostarczył żadnej klatki wideo',
		dimensionTimeout:
			'Przekroczono czas oczekiwania na wymiary okna {width}x{height}; kontynuowanie z {actualWidth}x{actualHeight}',
	},

	longExposureCapture: {
		busy: 'Przechwytywanie jest już w toku.',
		needsNativeCapture:
			'Długie naświetlanie wymaga przechwytywania wysokiej jakości (WGC). Włącz je w ustawieniach, aby z niego korzystać.',
		unavailable: 'Długie naświetlanie jest niedostępne na tym komputerze.',
		noTelemetry:
			'Długie naświetlanie wymaga telemetrii powtórki z iRacing. Sprawdź, czy symulator jest uruchomiony i znajduje się w sesji.',
		windowNotFound: 'Nie znaleziono okna iRacing.',
		cancelled: 'Przechwytywanie anulowane.',
		seekTimeout:
			'Powtórka nie dotarła na czas do klatki {frame}. Może się jeszcze wczytywać.',
		noPasses: 'Przechwytywanie musi wykonać co najmniej jeden przebieg.',
		playbackStalled:
			'Powtórka nie ruszyła. Sprawdź, czy iRacing nie został wstrzymany przez inne narzędzie.',
		exposureTimeout:
			'Naświetlanie nie dotarło do klatki {frame} w ciągu {seconds} s.',
		endedEarly:
			'Naświetlanie zakończyło się przed osiągnięciem wybranego momentu.',
		noFramesPresented:
			'iRacing nie wyświetlił żadnych klatek do przechwycenia.',
		subFrameNoSamples:
			'Ten czas migawki jest krótszy niż jedna klatka powtórki, a iRacing nie wyrenderował w nim żadnej klatki. Spróbuj wolniejszej prędkości odtwarzania albo kolejnego dłuższego czasu migawki.',
		noSamples:
			'Nie zebrano żadnych klatek. iRacing mógł przestać renderować w trakcie naświetlania.',
		blankCapture:
			'Każda przechwycona klatka była czarna, więc nie ma czego zapisać. Sprawdź, czy iRacing działa w trybie okna lub bez obramowania, a nie w wyłącznym trybie pełnoekranowym, oraz czy przy tej rozdzielczości ma jeszcze wolną pamięć karty graficznej — najszybciej to sprawdzić, obniżając rozdzielczość przechwytywania.',
		frozenCapture:
			'iRacing wyświetlił podczas naświetlania {samples} klatek, ale wszystkie były identyczne, więc ten obraz to zdjęcie statyczne, a nie długie naświetlanie. iRacing nie wyrenderował nic nowego w trakcie odtwarzania powtórki.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'GPU nie zwróciło obrazu.',
		bracketShortfall:
			'Bracketing zażądał {asked} czasów, ale wróciło {returned} — pozostałych nie udało się rozwiązać albo ta wersja składnika przechwytywania jest starsza niż bracketing.',
	},

	validation: {
		windowBeforeStart:
			'Naświetlanie wymaga {frames} klatek powtórki przed wybranym momentem, a znajduje się on zaledwie {anchor} klatek od początku powtórki. Wybierz późniejszy moment albo krótszy czas migawki.',
		pastEnd: 'Wybrany moment znajduje się poza końcem powtórki.',
		sessionChanged:
			'Od czasu przygotowania tego ujęcia powtórka przeszła do innej sesji. Wybierz moment ponownie.',
		singleSampleMultiPass:
			'Ten czas migawki jest tak krótki, że mieści się w nim około jednej klatki na przebieg, więc {passes} przebiegów zbierze mniej więcej {passes} próbek. Wolniejsza prędkość odtwarzania albo dłuższy czas migawki dadzą znacznie więcej.',
		singleSample:
			'Ten czas migawki jest tak krótki, że zmieści się w nim tylko jedna klatka, więc wynik nie będzie miał rozmycia ruchu. Wolniejsza prędkość odtwarzania albo dłuższy czas migawki dostarczą próbek.',
		bracketVsInterpolation:
			'Bracketing czasów migawki i {factor}x interpolacja klatek nie mogą działać jednocześnie, więc to ujęcie zostanie wykonane bez interpolacji. Wyłącz bracketing, jeśli klatki pośrednie są dla Ciebie ważniejsze niż dodatkowe czasy.',
		passesVsInterpolation:
			'Włączone są zarówno wiele przebiegów, jak i {factor}x interpolacja. Rywalizują ze sobą: interpolacja spowalnia każdy przebieg na tyle, że kosztuje go prawdziwe klatki, więc ten sam czas oczekiwania kupuje mniej prawdziwych próbek niż same przebiegi. Wyłączenie interpolacji zwykle daje lepsze ujęcie.',
		shortOfTarget:
			'Nawet przy prędkości 1/{divisor} to naświetlanie osiąga około {samples} próbek, mniej niż żądane {target}. Użyj dłuższego czasu migawki, aby uzyskać więcej.',
		longCaptureEscalate:
			'To przechwytywanie odtwarza powtórkę z prędkością 1/{divisor} przez około {duration} czasu rzeczywistego{passSuffix} i po rozpoczęciu nie da się go przyspieszyć. {advice}',
		longCaptureWarn:
			'To przechwytywanie potrwa około {duration} czasu rzeczywistego przy prędkości odtwarzania 1/{divisor}{passSuffix}.',
		passSuffix: ', rozłożone na {passes} przebiegów przez ten sam moment',
		adviceFewerPasses:
			'Mniej przebiegów kończy się wcześniej, przy mniejszej liczbie próbek.',
		adviceFasterPlayback:
			'Wyższa prędkość odtwarzania kończy się wcześniej, przy mniejszej liczbie próbek.',
		pastLogCap:
			'Przewiduje się, że to przechwytywanie zbierze około {samples} próbek w {passes} przebiegach, powyżej {cap}, które mieści dziennik diagnostyczny. Nie ma to wpływu na obraz — jedynie wskaźniki równomierności i przerw opiszą pierwszą część przechwytywania.',
		interpolationLossy:
			'Przy tym rozmiarze {factor}x interpolacja już wcześniej kosztowała ten komputer prawdziwe próbki. Rozważ niższy współczynnik, niższą rozdzielczość albo zamiast tego więcej przebiegów.',
	},

	duration: {
		zero: '0 sekund',
		seconds: {
			one: '{count} sekunda',
			few: '{count} sekundy',
			many: '{count} sekund',
			other: '{count} sekund',
		},
		minutes: {
			one: '{count} minuta',
			few: '{count} minuty',
			many: '{count} minut',
			other: '{count} minut',
		},
		minutesSeconds: '{minutes} min {seconds} s',
	},
};

export default pl;
