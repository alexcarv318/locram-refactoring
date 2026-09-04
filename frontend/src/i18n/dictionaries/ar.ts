import type { DictionaryKey } from "@/i18n/dictionaries/en";

export const ar: Record<DictionaryKey, string> = {
  "app.signInGate.title": "تسجيل الدخول مطلوب",
  "app.signInGate.description":
    "سجّل الدخول إلى حساب Locram قبل استخدام تطبيق سطح المكتب.",
  "app.signInGate.loadingTitle": "التحقق من الحساب",
  "app.signInGate.loadingDescription": "جارٍ تجهيز حالة تسجيل الدخول…",
  "app.signInGate.browserActivationCheck":
    "أكمل تسجيل الدخول في المتصفح، وسيواصل Locram Desktop من هنا.",
  "app.signInGate.waitingTitle": "في انتظار تسجيل الدخول عبر المتصفح",
  "app.signInGate.errorTitle": "تعذر الوصول إلى Locram",
  "app.signInGate.errorDescription":
    "تعذر على التطبيق التحقق من حالة حسابك. تحقق من الاتصال وحاول مرة أخرى.",
  "app.signInGate.retry": "إعادة المحاولة",
  "app.signInGate.openSignInPage": "فتح صفحة تسجيل الدخول",

  "settings.tab.general": "عام",
  "settings.tab.account": "الحساب",
  "settings.tab.maintenance": "الصيانة",
  "settings.tab.mcp": "MCP",

  "settings.region.label": "الإعدادات",
  "settings.sections.label": "أقسام الإعدادات",

  "settings.group.software": "البرنامج",
  "settings.group.runtime": "بيئة التشغيل",
  "settings.group.workers": "الخدمات الخلفية",
  "settings.group.subscription": "الاشتراك",
  "settings.group.access": "الحساب والوصول",
  "settings.group.appearance": "المظهر",
  "settings.group.embeddings": "البحث الدلالي",

  "editor.tabs.overflowMenu": "إجراءات التبويب",
  "editor.tabs.close": "إغلاق",
  "editor.tabs.closeOthers": "إغلاق الآخرين",
  "editor.tabs.closeAll": "إغلاق الكل",
  "editor.tabs.closeAllNotes": "إغلاق كل الملاحظات",
  "editor.tab.settings": "الإعدادات",
  "editor.tab.baseSharing": "مشاركة القاعدة",
  "editor.tab.externalUpdatePending": "تم التحديث خارجيًا أثناء التحرير",
  "editor.externalUpdate.banner":
    "تم تحديث هذه الملاحظة من مكان آخر بينما لديك تعديلات غير محفوظة. احفظ التغييرات أو تجاهلها لتحميل أحدث نسخة.",

  "settings.section.interface.language.title": "لغة الواجهة",
  "settings.section.interface.language.description":
    "اللغة التي تُعرض بها واجهة التطبيق",
  "settings.section.interface.language.label": "لغة الواجهة",
  "settings.section.interface.direction.title": "اتجاه القراءة",
  "settings.section.interface.direction.description":
    "اتجاه قراءة النص في التطبيق",
  "settings.section.interface.direction.label": "اتجاه القراءة",
  "settings.section.noteLanguage.title": "لغة الملاحظات",
  "settings.section.noteLanguage.description":
    "اللغة التي يكتب بها وكلاء الذكاء الاصطناعي الملاحظات",
  "settings.section.noteLanguage.label": "لغة الملاحظات",
  "settings.section.noteLanguage.hint":
    "ستُنشأ الملاحظات الجديدة من وكلاء الذكاء الاصطناعي بهذه اللغة.",
  "settings.section.noteLanguage.save": "حفظ",
  "settings.section.noteLanguage.saving": "جارٍ الحفظ...",
  "settings.section.runtime.title": "بيئة التشغيل",
  "settings.section.runtime.description":
    "افحص الخدمات الخلفية والاعتماديات عبر تشخيص desktop shell.",
  "settings.runtime.activeEmbedding": "التضمين النشط: {provider} ({model})",
  "settings.runtime.sourceShell":
    "المصدر الأساسي: تشخيص desktop shell. تُعرض حالة bridge كسياق إضافي.",
  "settings.runtime.unavailable":
    "تشخيص بيئة التشغيل متاح فقط داخل desktop shell.",
  "settings.runtime.loading": "جارٍ تحميل تشخيص بيئة التشغيل...",
  "settings.runtime.action.refresh": "تحديث",
  "settings.runtime.loadFailed": "تعذر تحميل تشخيص بيئة التشغيل.",
  "settings.runtime.servicesTitle": "الخدمات ({count})",
  "settings.runtime.dependenciesTitle": "الاعتماديات ({count})",
  "settings.runtime.noItems": "لم يتم الإبلاغ عن عناصر التشخيص.",
  "settings.runtime.notice.healthy": "بيئة التشغيل تعمل بشكل طبيعي.",
  "settings.runtime.notice.readOnly":
    "تشخيص بيئة التشغيل متاح من desktop shell.",
  "settings.runtime.notice.conflict":
    "تم اكتشاف تعارض مع عملية خارجية. لن يقوم Locram بإنهاء المستمعات الخارجية تلقائيًا.",
  "settings.runtime.notice.notOperable":
    "بيئة التشغيل ليست قابلة للعمل بالكامل. راجع العناصر المتدهورة قبل استخدام الميزات الخلفية.",
  "settings.runtime.notice.unsupported":
    "تشخيص استعادة بيئة التشغيل مدعوم حاليًا على macOS فقط.",
  "settings.runtime.notice.degraded":
    "بيئة التشغيل متدهورة لأن {label} ليس بحالة سليمة.",
  "settings.runtime.notice.needsRepair":
    "بيئة التشغيل تحتاج إلى إصلاح لأن {label} مفقود أو قديم أو غير موثّق.",
  "settings.runtime.notice.dependencyMissing":
    "بيئة التشغيل متوقفة لأن الاعتمادية {label} مفقودة.",
  "settings.runtime.notice.dependencyIncomplete":
    "بيئة التشغيل تنتظر حتى تصبح الاعتمادية {label} جاهزة.",
  "settings.runtime.notice.embeddingPending":
    "اعتماديات embeddings ما زالت قيد الإعداد. قد تظل ميزات البحث والميزات الدلالية غير مكتملة.",
  "settings.runtime.observedProcesses": "العمليات المرصودة ({count})",
  "settings.runtime.detail.pid": "PID {pid}",
  "settings.runtime.detail.port": "المنفذ {port}",
  "settings.runtime.detail.managedService": "خدمة مُدارة {label}",
  "settings.runtime.processRelation.listener": "المستمع",
  "settings.runtime.processRelation.parent": "العملية الأصلية",
  "settings.runtime.processRelation.process": "العملية",
  "settings.runtime.processRuntimeHome": "مسار بيئة التشغيل {path}",
  "settings.runtime.confidence.confirmedManaged": "مُدار",
  "settings.runtime.confidence.probablyManaged": "مرجّح",
  "settings.runtime.confidence.unverified": "غير موثّق",
  "settings.runtime.confidence.staleManaged": "قديم",
  "settings.runtime.confidence.foreignConflict": "خارجي",
  "settings.runtime.confidence.unknown": "غير معروف",
  "settings.runtime.action.restart": "إعادة التشغيل",
  "settings.runtime.action.restarting": "جارٍ إعادة التشغيل...",
  "settings.runtime.action.repair": "إصلاح",
  "settings.runtime.action.repairing": "جارٍ الإصلاح...",
  "settings.runtime.action.failed": "فشل إجراء بيئة التشغيل.",
  "settings.runtime.actionHint.degraded":
    "إعادة التشغيل متاحة لأن بيئة التشغيل متدهورة.",
  "settings.runtime.actionHint.needsRepair":
    "الإجراء المتوقع التالي هنا هو إصلاح للتسجيلات المُدارة المفقودة أو القديمة أو غير الموثّقة. تظل إعادة التشغيل غير متاحة هنا.",
  "settings.runtime.actionHint.conflict":
    "تظل إجراءات بيئة التشغيل معطلة بينما تملك عملية أخرى دورًا أو منفذًا مطلوبًا.",
  "settings.runtime.actionHint.conflictRepairable":
    "تبقى إعادة التشغيل معطلة بينما يملك runtime home آخر دورًا أو منفذًا مطلوبًا. يمكن للإصلاح استعادة مجموعة residue مؤكدة تخص locram دون إنهاء عمليات غير مرتبطة بشكل أعمى.",
  "settings.runtime.actionHint.dependencyMissing":
    "تظل إجراءات بيئة التشغيل معطلة حتى يتم تثبيت الاعتماديات المطلوبة وتصبح متاحة.",
  "settings.runtime.actionHint.dependencyIncomplete":
    "تظل إجراءات بيئة التشغيل معطلة بينما ما زالت الاعتماديات قيد الإعداد.",
  "settings.runtime.actionHint.unsupported":
    "إجراءات استعادة بيئة التشغيل مدعومة حاليًا على macOS فقط.",
  "settings.runtime.actionHint.unavailable":
    "تصبح إجراءات بيئة التشغيل متاحة عندما تُظهر التشخيصات حالة مدعومة وقابلة للتشغيل.",

  "settings.locale.en": "English",
  "settings.locale.ru": "Русский",
  "settings.locale.ar": "العربية",

  "settings.direction.ltr": "من اليسار إلى اليمين",
  "settings.direction.rtl": "من اليمين إلى اليسار",
  "settings.direction.auto": "تلقائي (حسب اللغة)",

  "workspace.header.toggleNavigation": "لوحة التنقل",
  "workspace.header.toggleInspector": "لوحة المعاينة",
  "workspace.header.back": "رجوع",
  "workspace.header.forward": "تقدم",
  "workspace.header.reload": "إعادة تحميل التطبيق",
  "workspace.header.openSettings": "فتح الإعدادات",
  "workspace.header.closeSettings": "إغلاق الإعدادات",
  "workspace.header.settings": "الإعدادات",
  "workspace.header.switchToDarkTheme": "السمة الداكنة",
  "workspace.header.switchToLightTheme": "السمة الفاتحة",

  "workspace.search.label": "البحث في المحتوى",
  "workspace.search.placeholder": "ابحث في الملاحظات…",
  "workspace.search.noResults": "لا توجد ملاحظات مطابقة",
  "workspace.search.matchKind.title": "العنوان",
  "workspace.search.matchKind.id": "معرّف الملاحظة",
  "workspace.search.matchKind.content": "المحتوى",
  "workspace.search.matchKind.other": "تطابق",

  "tree.item.toggle": "تبديل: {label}",
  "tree.header.toggleSection": "تبديل القسم: {title}",
  "tree.folder.emptyDefault": "لا توجد {label}",

  "tree.notes.title": "الملاحظات",
  "tree.notes.empty": "لا توجد ملاحظات",
  "tree.notes.titlePlaceholder": "عنوان الملاحظة",
  "tree.notes.addNewNote": "ملاحظة جديدة",
  "tree.notes.addInside": "إضافة ملاحظة بالداخل",
  "tree.notes.edit": "تعديل العنوان",
  "tree.notes.delete": "حذف الملاحظة",
  "tree.notes.copyId": "نسخ معرف الملاحظة",
  "tree.notes.copyIdCopied": "تم نسخ المعرف",
  "tree.notes.copyIdAriaCopied": "تم نسخ معرف الملاحظة",
  "tree.notes.deleteConfirmLabel": "حذف «{title}»؟",

  "common.collapseAll": "طي الكل",
  "common.confirm": "تأكيد",
  "common.cancel": "إلغاء",
  "common.delete": "حذف",
  "common.loading": "جارٍ التحميل…",

  "smartFolders.section.title": "المجلدات",
  "smartFolders.section.quickAccess": "الوصول السريع",
  "smartFolders.section.customScope": "النطاقات المخصصة",
  "smartFolders.branch.created": "أُنشئ",
  "smartFolders.branch.modified": "عُدّل",
  "smartFolders.branch.toggle": "تبديل {label}",
  "smartFolders.preset.copyId": "نسخ معرف النطاق",
  "smartFolders.preset.copyIdCopiedTitle": "تم النسخ",
  "smartFolders.preset.copyIdCopiedAria": "تم نسخ معرف النطاق",
  "smartFolders.preset.edit": "تعديل النطاق الذكي",
  "smartFolders.preset.delete": "حذف النطاق",
  "smartFolders.preset.deleteConfirmLabel": "حذف «{name}»؟",
  "smartFolders.export.subgraph": "تصدير الرسم الفرعي",
  "smartFolders.export.subgraphTitle": "تصدير كأرشيف الرسم الفرعي",
  "smartFolders.customScope.create": "إنشاء نطاق مخصص",
  "smartFolders.customScope.empty":
    "اضغط + لحفظ المرشح الحالي كنطاق مخصص.",
  "smartFolders.scope.clearLabel": "إزالة النطاق الذكي النشط {name}",
  "smartFolders.scope.activeLabel": "النطاق النشط: {name}",
  "filters.scope.clearLabel": "إزالة النطاق النشط {name}",
  "smartFolders.builtIn.today": "اليوم",
  "smartFolders.builtIn.week": "الأسبوع",
  "smartFolders.builtIn.month": "الشهر",
  "smartFolders.builtIn.needReview": "بحاجة إلى مراجعة",
  "smartFolders.builtIn.orphaned": "بدون روابط",
  "smartFolders.builtIn.scopeLabel": "{branch}: {period}",

  "bases.section.local": "محلية",
  "bases.section.bases": "القواعد",
  "bases.section.artifacts": "الأرشيفات",
  "bases.section.remote": "البعيدة",
  "bases.section.builtIn": "مدمج",

  "settings.section.edition.title": "الإصدار",
  "settings.section.edition.description": "إصدار سطح المكتب الحالي.",
  "settings.section.subscription.title": "الاشتراك",
  "settings.section.subscription.description":
    "يتحكم في الاشتراكات المدفوعة على هذا الجهاز.",
  "settings.section.subscription.description.pro":
    "اشتراك Pro نشط على هذا الجهاز.",
  "settings.section.subscription.description.trial":
    "الوصول التجريبي نشط على هذا الجهاز.",
  "settings.section.subscription.description.free":
    "فعّل Pro لفتح ميزات سطح المكتب المُدارة والمزايا المدفوعة على هذا الجهاز.",
  "settings.section.subscription.description.notConnected":
    "سجّل الدخول لعرض اشتراكك وإدارته على هذا الجهاز.",
  "settings.section.subscription.action.manage": "إدارة الاشتراك",
  "settings.section.account.title": "الحساب",
  "settings.section.account.description.openBilling":
    "افتح إعدادات الفوترة والحساب في المتصفح.",
  "settings.section.account.description.openBillingNeedsUrl":
    "افتح إعدادات الفوترة والحساب في المتصفح. اضبط VITE_LOCRAM_ACCOUNT_WEB_URL أولاً.",
  "settings.section.account.description.reconnect":
    "سجّل الدخول مجددًا لاستعادة تفعيل Locram المرتبط بهذا الجهاز.",
  "settings.section.account.description.connect":
    "سجّل الدخول لربط هذا الجهاز بحساب Locram.",
  "settings.section.account.description.noSubscription":
    "الحساب متصل، لكن هذا الجهاز لا يملك اشتراك Pro نشطًا بعد.",
  "settings.section.account.action.upgradeToPro": "ترقية إلى Pro",
  "settings.section.account.action.connectPro": "تفعيل Pro",
  "settings.section.account.action.open": "فتح الحساب",
  "settings.section.account.action.reconnect": "إعادة الاتصال",
  "settings.section.account.action.connect": "تسجيل الدخول",
  "settings.section.account.action.connecting": "جارٍ تسجيل الدخول...",
  "settings.section.account.signInRequiredTitle": "تسجيل الدخول مطلوب",
  "settings.section.account.signInRequiredDescription":
    "سجّل الدخول إلى حساب Locram قبل إعداد ميزات سطح المكتب المُدارة على هذا الجهاز.",
  "settings.section.account.signOut": "تسجيل الخروج",
  "settings.section.account.signOutPending": "جارٍ تسجيل الخروج...",
  "settings.section.account.forgetDevice": "نسيان الجهاز",
  "settings.section.account.forgetDevicePending": "جارٍ النسيان...",

  "nodeCard.openNode": "افتح عقدة الرسم البياني",
  "nodeCard.collapseMetadata": "طي بيانات الملاحظة",
  "nodeCard.expandMetadata": "توسيع بيانات الملاحظة",
  "nodeCard.collapseGroup": "طي المجموعة",
  "nodeCard.expandGroup": "توسيع المجموعة",
  "nodeCard.itemsCount": "{count} عناصر",
  "nodeCard.itemsCountOne": "{count} عنصر",
  "nodeCard.metadata.updated": "محدّث",
  "nodeCard.metadata.created": "أنشئ",
  "nodeCard.metadata.reviewed": "روجع",
  "nodeCard.metadata.reviewIn": "المراجعة بعد",
  "nodeCard.reviewInterval.days": "{count} يومًا",
  "nodeCard.title.untitled": "بدون عنوان",
  "common.none": "بدون",

  "nodeCard.status.active": "نشطة",
  "nodeCard.status.archived": "مؤرشفة",
  "nodeCard.status.toDelete": "للحذف",

  "nodeCard.type.fleeting": "عابرة",
  "nodeCard.type.noteTaking": "تدوين",
  "nodeCard.type.permanent": "دائمة",
  "nodeCard.type.structure": "هيكلية",
  "nodeCard.type.hub": "محور",
  "nodeCard.type.tag": "وسم",
  "nodeCard.type.node": "عقدة",

  "parentGroupCard.other": "أخرى",
  "parentGroupCard.selectedCount": "تم تحديد {count}",

  "network.section.sharesIManage": "المشاركات التي أديرها",
  "network.tooltips.openBaseSharingManagement": "فتح إدارة مشاركة القاعدة",
  "network.tooltips.openBaseSharingManagementBlocked":
    "تتطلب المشاركة اشتراك Pro نشطًا",
  "network.tooltips.refreshSharesIManage": "تحديث المشاركات التي أديرها",
  "network.tooltips.openBaseSharing": "فتح مشاركة القاعدة",
  "network.tooltips.inspect": "فحص",
  "network.tooltips.copyGrantId": "نسخ معرّف المنح",
  "network.tooltips.revokeBaseGrant": "إلغاء منح القاعدة",
  "network.tooltips.deleteBaseGrant": "حذف منح القاعدة",

  "bases.tooltips.shareThisBase": "مشاركة هذه القاعدة",
  "bases.tooltips.mergeIntoActiveBase": "دمج في القاعدة النشطة",
  "bases.tooltips.rename": "إعادة تسمية",
  "bases.tooltips.renameForRecipient": "إعادة تسمية لهذا المستلم",
  "bases.tooltips.backupNow": "نسخ احتياطي الآن",
  "bases.tooltips.inspect": "فحص",
  "bases.tooltips.copyBaseId": "نسخ base_id",
  "bases.tooltips.copyGrantId": "نسخ معرّف المنح",
  "bases.tooltips.copyPath": "نسخ المسار",
  "bases.tooltips.unregister": "إلغاء التسجيل",
  "bases.tooltips.deleteBase": "حذف القاعدة",
  "bases.tooltips.removeFromSharedWithMe": "الإزالة من المشاركة معي",
  "bases.tooltips.createNewBase": "إنشاء قاعدة جديدة",
  "bases.tooltips.openDatabaseFile": "فتح ملف قاعدة البيانات",
  "bases.openDatabase.title": "فتح ملف قاعدة البيانات",
  "bases.openDatabase.description.multiBase":
    "اختر ملف قاعدة بيانات متوافقًا مع Locram وافحصه أولًا، ثم سجّله أو ادمجه أو استعده من الصفحة الرئيسية للملف",
  "bases.openDatabase.description.singleBase":
    "اختر ملف قاعدة بيانات متوافقًا مع Locram وافحصه أولًا، ثم استبدل قاعدة البيانات الحالية من الصفحة الرئيسية للملف عند الحاجة",
  "bases.openDatabase.pathLabel": "مسار ملف قاعدة البيانات",
  "bases.openDatabase.pathPlaceholder": "~/.locram/my-base.db أو مسار مطلق",
  "bases.openDatabase.fileSectionLabel": "الملف",
  "bases.openDatabase.dropHint.desktop":
    "بينما يكون هذا الحوار مفتوحًا، أسقط ملف .db في أي مكان داخل نافذة Locram أو استخدم اختيار ملف",
  "bases.openDatabase.dropHint.browser":
    "لا يمكن للمتصفح ملء المسار من السحب والإفلات. استخدم تطبيق Locram أو الصق مسارًا مطلقًا أعلاه",
  "bases.openDatabase.chooseFile": "اختيار ملف",
  "bases.openDatabase.chooseFileDisabled":
    "اختيار الملف متاح في تطبيق Locram",
  "bases.openDatabase.footerHint.multiBase":
    "يفحص Locram المصدر والتوافق في الصفحة الرئيسية للملف قبل التسجيل أو الدمج أو الاستعادة",
  "bases.openDatabase.footerHint.singleBase":
    "يفحص Locram المصدر والتوافق في الصفحة الرئيسية للملف. في Free يمكن استبدال قاعدة البيانات الحالية فقط عند اختيار ذلك صراحة",
  "bases.openDatabase.error.wrongExtension":
    "أسقط ملف قاعدة بيانات بامتداد .db أو .sqlite أو .sqlite3",
  "bases.openDatabase.error.browserDropPathHidden":
    "لا يمكن للمتصفح قراءة المسار الكامل من السحب والإفلات. أدخل المسار المطلق يدويًا",
  "bases.openDatabase.error.nativeDropUnavailable":
    "إفلات الملفات الأصلي غير متاح في هذا الإصدار. استخدم اختيار ملف أو اكتب المسار",
  "bases.openDatabase.error.openFailed": "تعذّر فتح ملف قاعدة البيانات",
  "bases.openDatabase.dialogPickerTitle": "اختيار ملف قاعدة البيانات",
  "bases.openDatabase.dialogPickerFilter": "قاعدة بيانات Locram",
  "bases.openDatabase.action.cancel": "إلغاء",
  "bases.openDatabase.action.open": "فتح الملف",
  "bases.openDatabase.action.opening": "جارٍ الفتح…",
  "bases.tooltips.refreshLocalSources": "تحديث المصادر المحلية",
  "bases.tooltips.addSharedBase": "إضافة قاعدة مشتركة",
  "bases.tooltips.refreshRemoteSources": "تحديث المصادر البعيدة",
  "bases.tooltips.cannotMergeBaseIntoItself": "لا يمكن دمج القاعدة في نفسها",
  "bases.tooltips.hideFromAgent": "إخفاء من الوكيل",
  "bases.tooltips.showToAgent": "إظهار للوكيل",
  "bases.tooltips.agentAccessWrite": "الوكيل: وصول كامل",
  "bases.tooltips.agentAccessRead": "الوكيل: للقراءة فقط",
  "bases.tooltips.agentAccessHidden": "الوكيل: مخفي",
  "bases.tooltips.switchBeforeUnregister":
    "بدّل إلى قاعدة أخرى قبل إلغاء التسجيل",
  "bases.tooltips.switchBeforeDelete":
    "بدّل إلى قاعدة أخرى قبل حذف هذه القاعدة",
  "bases.tooltips.sharedBaseUnavailableForInspection":
    "القاعدة المشتركة غير متاحة للفحص",
  "bases.tooltips.hideDuplicateEntries": "إخفاء الإدخالات المكررة",
  "bases.tooltips.revealDuplicateEntries": "إظهار الإدخالات المكررة",
  "bases.tooltips.copyValue": "نسخ {label}",
  "bases.tooltips.adminAccessRequiredToShare":
    "تتطلب مشاركة هذه القاعدة صلاحية المسؤول",
  "bases.tooltips.resharingRequiresAuthority":
    "تتطلب إعادة مشاركة القاعدة المستلمة بيانات اعتماد التوقيع من الجهة المالكة، وهي غير متاحة في هذه الواجهة",
  "bases.tooltips.adminAccessRequiredToMerge":
    "تتطلب دمج هذه القاعدة المشتركة صلاحية المسؤول",
  "bases.tooltips.activeBaseRequiredForMerge":
    "يلزم وجود قاعدة محلية نشطة لإجراء الدمج",
  "bases.tooltips.sharedBaseUnavailableForMerge":
    "القاعدة المشتركة غير متاحة للدمج",
  "bases.tooltips.adminAccessRequiredToBackup":
    "تتطلب نسخ هذه القاعدة المشتركة احتياطيًا صلاحية المسؤول",
  "bases.tooltips.sharedBaseUnavailableForBackup":
    "القاعدة المشتركة غير متاحة للنسخ الاحتياطي",
  "network.tooltips.basePathUnavailableForInspection":
    "مسار القاعدة غير متاح للفحص",

  "common.clear": "مسح",
  "common.today": "اليوم",
  "common.untitled": "بدون عنوان",
  "common.unavailable": "غير متاح",

  "editor.fontSize.decrease": "تصغير الخط",
  "editor.fontSize.increase": "تكبير الخط",
  "editor.copyContent": "نسخ المحتوى",
  "editor.copyContent.copied": "تم النسخ",
  "editor.copyContent.copiedAria": "تم نسخ المحتوى",
  "editor.noFileSelected": "لم يتم تحديد ملف.",
  "editor.loadingEditor": "جارٍ تحميل المحرر…",
  "editor.loadingNote.description": "جارٍ تحميل الملاحظة من القاعدة…",
  "editor.loadingNote.message": "تحميل الملاحظة",
  "editor.region.label": "محرر الملاحظات",

  "graph.modal.expandedGraphScope": "نطاق الرسم البياني الموسّع",
  "graph.modal.hideSourcesPanel": "إخفاء لوحة المصادر",
  "graph.modal.showSourcesPanel": "إظهار لوحة المصادر",
  "graph.modal.closeModal": "إغلاق النافذة",
  "graph.modal.refreshing.description": "جارٍ تحديث نطاق الرسم البياني الحالي...",
  "graph.modal.refreshing.message": "تحديث الرسم البياني",

  "smartFolder.modal.titleEdit": "تعديل المجلد الذكي",
  "smartFolder.modal.titleCreate": "إنشاء مجلد ذكي",
  "smartFolder.modal.descriptionEdit":
    "حدّث نطاق التصفية المحفوظ وأبق لوحة الفلاتر السريعة متزامنة.",
  "smartFolder.modal.descriptionCreate":
    "سمِّ العرض المحفوظ وعرّف نطاق التصفية في مكان واحد.",
  "smartFolder.modal.sectionName": "الاسم",
  "smartFolder.modal.namePlaceholder": "اسم المجلد الذكي",
  "smartFolder.modal.couldNotSave": "تعذّر حفظ المجلد الذكي.",
  "smartFolder.modal.exportTitle": "تصدير كمنتج رسم بياني فرعي",
  "smartFolder.modal.exportComplete": "اكتمل التصدير — {count} صفحات",
  "smartFolder.modal.loadingPages": "جارٍ تحميل الصفحات…",
  "smartFolder.modal.filterMatchCount":
    "{matched} من {total} صفحات تطابق الفلتر الحالي.",
  "smartFolder.modal.adjustFilter":
    " عدّل الفلتر أعلاه لتضمين صفحات.",
  "smartFolder.modal.packageLabelPlaceholder": "اسم الحزمة (اختياري)",
  "smartFolder.modal.exporting": "جارٍ التصدير…",
  "smartFolder.modal.exportButton": "تصدير {count} صفحات",
  "smartFolder.modal.createSubgraphExport": "إنشاء تصدير الرسم البياني الفرعي",
  "smartFolder.modal.saving": "جارٍ الحفظ…",
  "smartFolder.modal.save": "حفظ",
  "smartFolder.modal.createSmartFolderAction": "إنشاء مجلد ذكي",
  "smartFolder.modal.exportFailed": "فشل التصدير",

  "filters.title.type": "النوع",
  "filters.title.status": "الحالة",
  "filters.title.relations": "العلاقات",
  "filters.title.created": "تاريخ الإنشاء",
  "filters.title.updated": "آخر تحديث",
  "filters.title.reviewed": "تاريخ المراجعة",
  "filters.clearSelection": "مسح التحديد",
  "filters.selectAll": "تحديد الكل",
  "filters.clearGroupAria": "مسح «{title}»",
  "filters.selectAllGroupAria": "تحديد الكل في «{title}»",
  "filters.clearDateRange": "مسح نطاق التاريخ",
  "filters.clearDateRangeAria": "مسح نطاق «{title}»",
  "filters.selectStartDate": "اختر تاريخ البداية",
  "filters.selectEndDate": "اختر تاريخ الانتهاء",
  "filters.saveAsSmartFolder": "حفظ كمجلد ذكي…",

  "filters.metadata.heading": "قواعد البيانات الوصفية",
  "filters.metadata.descriptionPrefix": "اجمع القواعد باستخدام",
  "filters.metadata.descriptionMiddle": "أو",
  "filters.metadata.descriptionSuffix":
    ". استخدم ذلك لمنطق العنوان والموضوع والوسوم.",
  "filters.metadata.and": "و",
  "filters.metadata.or": "أو",
  "filters.metadata.not": "ليس",
  "filters.metadata.addGroup": "إضافة مجموعة",
  "filters.metadata.removeGroup": "إزالة المجموعة",
  "filters.metadata.addRule": "إضافة قاعدة",
  "filters.metadata.removeRule": "إزالة",
  "filters.metadata.group": "المجموعة {index}",
  "filters.metadata.rule": "القاعدة {index}",
  "filters.metadata.groupJoinerLabel": "رابط المجموعة",
  "filters.metadata.field": "الحقل",
  "filters.metadata.operator": "العامل",
  "filters.metadata.titleField": "العنوان",
  "filters.metadata.subjectField": "الموضوع",
  "filters.metadata.tagField": "الوسم",
  "filters.metadata.titlePlaceholder": "اكتب نص العنوان...",
  "filters.metadata.searchSubject": "ابحث في الموضوع...",
  "filters.metadata.searchTag": "ابحث في الوسوم...",
  "filters.metadata.emptySubject": "لم يتم تحديد قيم للموضوع.",
  "filters.metadata.emptyTag": "لم يتم تحديد قيم للوسوم.",
  "filters.metadata.op.contains": "يحتوي على",
  "filters.metadata.op.doesNotContain": "لا يحتوي على",
  "filters.metadata.op.hasAnyOf": "يحتوي على أي من",
  "filters.metadata.op.hasAllOf": "يحتوي على كل من",
  "filters.metadata.op.hasNoneOf": "لا يحتوي على أي من",

  "filters.multiSelect.all": "الكل",
  "filters.multiSelect.clear": "مسح",
  "filters.multiSelect.added": "مُضاف",
  "filters.multiSelect.add": "إضافة",
  "filters.multiSelect.noMatches": "لا توجد نتائج.",
  "filters.multiSelect.searchAria": "بحث: {field}",
  "filters.multiSelect.clearSearchAria": "مسح البحث: {field}",

  "linkType.parent": "أب",
  "linkType.tag": "وسم",
  "linkType.related": "ذات صلة",
  "linkType.extends": "يمتد",
  "linkType.extended_by": "ممتد بواسطة",
  "linkType.supports": "يدعم",
  "linkType.supported_by": "مدعوم بواسطة",
  "linkType.contradicts": "يناقض",
  "linkType.contradicted_by": "متناقض مع",
  "linkType.refines": "يصقل",
  "linkType.refined_by": "مصقول بواسطة",
  "linkType.questions": "يطرح أسئلة",
  "linkType.questioned_by": "موضع تساؤل من",
  "linkType.reference": "مرجع",

  "pageStatus.active": "نشطة",
  "pageStatus.archived": "مؤرشفة",
  "pageStatus.to_delete": "للحذف",

  "pageType.fleeting": "عابرة",
  "pageType.noteTaking": "تدوين",
  "pageType.permanent": "دائمة",
  "pageType.structure": "هيكلية",
  "pageType.hub": "محور",

  "fileHome.section.details": "التفاصيل",
  "fileHome.section.statistics": "الإحصاءات",
  "fileHome.showAdvanced": "إظهار المتقدّمة",
  "fileHome.hideAdvanced": "إخفاء المتقدّمة",
  "fileHome.classLabel.localBase": "قاعدة محلية",
  "fileHome.classLabel.builtInBase": "مدمجة",
  "fileHome.classLabel.snapshot": "لقطة",
  "fileHome.classLabel.scopedExport": "تصدير محدّد النطاق",
  "fileHome.compatibility.ready": "جاهزة",
  "fileHome.compatibility.corrupted": "تالفة",
  "fileHome.compatibility.unsupportedSchema": "مخطط غير مدعوم",
  "fileHome.compatibility.migrationRequired": "تحتاج إلى ترحيل",

  "fileHome.layout.badge.localBase": "قاعدة محلية",
  "fileHome.layout.badge.sharedBase": "قاعدة مشتركة",
  "fileHome.layout.badge.builtIn": "مدمجة",
  "fileHome.layout.subtitle.localBaseActive": "ملخص وإجراءات للقاعدة النشطة.",
  "fileHome.layout.subtitle.localBaseInspect": "عرض دون تفعيل هذه القاعدة.",
  "fileHome.layout.subtitle.managedBaseActive": "ملخص وإجراءات للقاعدة المدمجة.",
  "fileHome.layout.subtitle.managedBaseInspect": "عرض دون تفعيل هذه القاعدة المدمجة.",
  "fileHome.layout.subtitle.sharedBase": "تفاصيل القاعدة المشتركة وإجراءات المستلم.",
  "fileHome.layout.subtitle.sharedBaseActive":
    "هذه القاعدة المشتركة نشطة كقاعدة العمل الحالية. الملاحظات والرسم البياني والبحث مقيدون بالقاعدة البعيدة بينما يبقى الملكية والوصول غير محليين.",
  "fileHome.layout.subtitle.sharedBaseInspect": "عرض هذه القاعدة المشتركة دون جعلها قاعدة العمل النشطة.",
  "fileHome.sharedBase.statsRemoteUnavailable":
    "الإحصاءات غير متاحة لأن هذه القاعدة المشتركة بلا مرآة محلية وجهاز المالك غير متصل عبر الوسيط حالياً. شغّل access connect على جهاز المالك، أو أنشئ مرآة محلية (نسخة احتياطية) بصلاحيات admin.",
  "fileHome.action.active": "نشطة",
  "fileHome.action.activate": "تفعيل",
  "fileHome.confirm.registerAsNewDb": "تسجيل {name} كقاعدة بيانات جديدة؟",
  "fileHome.confirm.registerAction": "تأكيد التسجيل كقاعدة جديدة",
  "fileHome.confirm.registerPending": "جارٍ التسجيل…",
  "fileHome.confirm.deleteArtifact": "حذف {name}؟",
  "fileHome.confirm.deleteAction": "تأكيد الحذف",
  "fileHome.confirm.deletePending": "جارٍ الحذف…",
  "fileHome.confirm.mergePlan":
    "دمج {pages} ملاحظات و{edges} حواف جديدة في {target}؟",
  "fileHome.confirm.mergeAction": "تأكيد الدمج في القاعدة النشطة",
  "fileHome.confirm.mergePending": "جارٍ الدمج…",
  "fileHome.confirm.renameArtifactPlaceholder": "اسم ملف المنتج",
  "fileHome.confirm.renameAction": "تأكيد إعادة التسمية",
  "fileHome.confirm.renamePending": "جارٍ إعادة التسمية…",
  "fileHome.confirm.unregisterAction": "إلغاء التسجيل",
  "fileHome.confirm.unregisterPrompt":
    "إلغاء تسجيل {name}؟ يبقى الملف على القرص.",
  "fileHome.confirm.deleteBaseAction": "حذف القاعدة",
  "fileHome.confirm.deleteBasePrompt": "حذف {name} وملفها؟",

  "dock.sources": "المصادر",
  "dock.network": "الشبكة",
  "dock.notes": "الملاحظات",

  "sources.toolbar.search.label": "البحث في المصادر",
  "sources.toolbar.search.placeholder": "ابحث…",
  "sources.toolbar.search.clear": "مسح البحث في المصادر",
  "sources.toolbar.edit.exit": "الخروج من وضع التعديل",
  "sources.toolbar.edit.enter": "تعديل العقد",
  "sources.toolbar.graph.show": "إظهار الرسم البياني",
  "sources.toolbar.graph.hide": "إخفاء الرسم البياني",
  "sources.toolbar.filters.toggle": "المرشحات",
  "sources.toolbar.filters.reset": "إعادة ضبط جميع المرشحات",
  "sources.toolbar.filters.returnToPreset": "العودة إلى النطاق «{name}»",

  "fileHome.detail.path": "المسار",
  "fileHome.detail.kind": "النوع",
  "fileHome.detail.compatibility": "التوافق",
  "fileHome.detail.registered": "تاريخ التسجيل",
  "fileHome.detail.lastOpened": "آخر فتح",
  "fileHome.detail.provenance": "المصدر",
  "fileHome.detail.provenanceManagedRemote": "منتج بعيد مُدار",
  "fileHome.detail.provenanceManagedPackaged": "لقطة مدمجة من الحزمة",
  "fileHome.detail.managedVersion": "الإصدار",
  "fileHome.detail.managedUpdated": "آخر تحديث",
  "fileHome.detail.copyPathError": "تعذّر نسخ مسار التركيب.",
  "fileHome.detail.baseId": "معرّف القاعدة",
  "fileHome.detail.artifactId": "معرّف المنتج",
  "fileHome.detail.sourceBaseId": "معرّف القاعدة الأصلية",
  "fileHome.detail.packageLabel": "وسم الحزمة",
  "fileHome.detail.attachmentCoverage": "تغطية المرفقات",
  "fileHome.detail.created": "تاريخ الإنشاء",
  "fileHome.detail.activated": "تاريخ التفعيل",
  "fileHome.detail.schemaVersion": "إصدار المخطط",
  "fileHome.detail.artifactSchemaFamily": "عائلة مخطط المنتج",
  "fileHome.detail.artifactSchemaVersion": "إصدار مخطط المنتج",
  "fileHome.detail.errors": "الأخطاء",
  "fileHome.detail.shareBaseId": "معرّف القاعدة المشتركة",
  "fileHome.detail.grantId": "معرّف المنحة",
  "fileHome.detail.entryId": "معرّف الإدخال",
  "fileHome.detail.expires": "تاريخ الانتهاء",
  "fileHome.detail.openEnded": "بدون حد",
  "fileHome.detail.ownerActor": "المالك (الفاعل)",
  "fileHome.detail.authorityPath": "مسار السلطة",
  "fileHome.detail.owner": "المالك",
  "fileHome.detail.recipient": "المستلم",
  "fileHome.detail.access": "الوصول",
  "fileHome.detail.visibility": "الظهور",
  "fileHome.detail.visibleToAgent": "ظاهر للوكيل",
  "fileHome.detail.authority": "مصدر الوصول",
  "fileHome.detail.remoteBrokerAccess": "وصول عبر الوسيط البعيد",
  "fileHome.detail.localMirrorAvailable": "نسخة محلية متاحة",
  "fileHome.detail.hiddenFromAgent": "مخفي عن الوكيل",
  "fileHome.detail.copyPath": "نسخ المسار",
  "fileHome.detail.pathCopied": "تم نسخ المسار",
  "fileHome.detail.loadingRegistry": "جارٍ تحميل بيانات السجل…",
  "fileHome.detail.loadingShort": "جارٍ التحميل…",

  "fileHome.metric.notes": "الملاحظات",
  "fileHome.metric.edges": "الحواف",
  "fileHome.metric.size": "الحجم",
  "fileHome.metric.unembedded": "بدون تضمين",
  "fileHome.metric.orphaned": "بدون روابط",
  "fileHome.metric.dueReview": "مستحقة المراجعة",
  "fileHome.embedAction.fix": "الناقص",
  "fileHome.embedAction.running": "جارٍ",
  "fileHome.embedAction.tooltip": "الحصول على التضمينات المفقودة",
  "fileHome.embedAction.success": "اكتمل تحديث التضمينات لـ {label}.",
  "fileHome.embedAction.failed": "تعذّر تحديث التضمينات.",

  "fileHome.metricDetail.notesActiveTotal":
    "{active} نشطة / {total} إجمالاً",
  "fileHome.metricDetail.notesLoading":
    "جارٍ تحميل إجماليات الملاحظات من بيانات السجل",
  "fileHome.metricDetail.notesUnavailable":
    "إجماليات الملاحظات غير متاحة",
  "fileHome.metricDetail.edgesInBase":
    "الحواف المُكتَّبة المخزّنة في هذه القاعدة",
  "fileHome.metricDetail.edgesInSharedBase":
    "الحواف المُكتَّبة المُبلَّغ عنها من القاعدة المشتركة",
  "fileHome.metricDetail.edgesInFile":
    "الحواف المحفوظة الموجودة في هذا الملف",
  "fileHome.metricDetail.notesInFile":
    "الملاحظات المحفوظة الموجودة في هذا الملف",
  "fileHome.metricDetail.notesInSharedBase":
    "إحصاءات مُبلَّغ بها من القاعدة المشتركة المستلمة.",
  "fileHome.metricDetail.sqliteSize": "حجم ملف SQLite",
  "fileHome.metricDetail.sharedBaseSize":
    "حجم SQLite للقاعدة المشتركة عند توفره",
  "fileHome.metricDetail.unembedded":
    "ملاحظات تفتقر إلى تضمينات المحتوى",
  "fileHome.metricDetail.orphaned":
    "ملاحظات بدون أب أو حواف",
  "fileHome.metricDetail.dueReview":
    "ملاحظات تستحق المراجعة حاليًا",

  "fileHome.management.title": "الإدارة",
  "fileHome.management.descriptionBase":
    "استخدم هذه الصفحة لإجراءات على مستوى القاعدة. الملاحظات والرسم البياني مسؤولان عن التصفح وسياق العقد.",
  "fileHome.management.descriptionInspect":
    "تبقى هذه الشاشة في وضع المعاينة. الإجراءات التي تحتاج إلى ملكية تشغيلية ستبدّل القاعدة النشطة أولاً.",
  "fileHome.management.descriptionArtifact":
    "استخدم هذه الصفحة لإجراءات على مستوى المنتج.",
  "fileHome.management.descriptionManagedRemote":
    "يُعيد «تحديث الملخص» تحميل مقاييس الملخص وشجرة الملاحظات من التركيب الحالي. يستبدل «تنزيل التحديث» ملف SQLite المُركَّب من قناة الإصدار البعيدة المُعرَّفة ويعيد تشغيل الإحماء الدلالي. الدمج والحذف وإلغاء التسجيل وإعادة التسمية غير متاحة عمدًا للقواعد المدمجة.",
  "fileHome.management.descriptionManagedLocal":
    "تُركَّب هذه القاعدة المدمجة للقراءة فقط من التثبيت المحلي. يُعيد «تحديث الملخص» تحميل مقاييس الملخص وشجرة الملاحظات من التركيب الحالي. لا يوجد مصدر تحديث بعيد مُعرَّف بعد، لذا «تنزيل التحديث» غير متاح.",
  "fileHome.management.localeLabel": "اللغة",
  "fileHome.management.actionManagedSummaryRefresh": "تحديث الملخص",
  "fileHome.management.actionManagedSummaryRefreshPending": "جارٍ تحديث الملخص…",
  "fileHome.management.actionManagedUpdate": "تنزيل التحديث",
  "fileHome.management.actionManagedUpdatePending": "جارٍ تنزيل التحديث…",
  "fileHome.management.managedUpdateChannelNoteRemote":
    "يمكن استبدال اللقطة المُركَّبة الحالية من قناة النشر المُعرَّفة.",
  "fileHome.management.managedUpdateChannelNoteLocal":
    "تستخدم هذه القاعدة المدمجة حاليًا اللقطة المحلية من الحزمة لأنه لا يوجد مصدر تحديث بعيد مُعرَّف.",
  "fileHome.management.managedRefreshSuccess":
    "تم تحديث {label} إلى أحدث لقطة مُركَّبة واكتمل الإحماء الدلالي.",
  "fileHome.management.managedRefreshError": "تعذّر تحديث القاعدة المدمجة.",
  "fileHome.management.managedSummaryReloadSuccess":
    "تمت إعادة تحميل الملخص وشجرة الملاحظات لـ {label}.",
  "fileHome.management.managedSummaryReloadError":
    "تعذّر إعادة تحميل ملخص القاعدة المدمجة.",
  "fileHome.management.managedActivateError": "تعذّر تفعيل هذه القاعدة المدمجة.",
  "fileHome.management.basesRegistryLoadError":
    "تعذّر تحميل بيانات سجل القواعد النشطة.",
  "fileHome.management.action.mergeBase": "دمج القاعدة",
  "fileHome.management.action.shareBase": "مشاركة القاعدة",
  "fileHome.management.action.backupNow": "نسخ احتياطي الآن",
  "fileHome.management.action.hideFromAgent": "إخفاء عن الوكيل",
  "fileHome.management.action.showToAgent": "إظهار للوكيل",
  "fileHome.management.action.copyBaseId": "نسخ base_id",
  "fileHome.management.action.copyBaseIdCopied": "تم نسخ base_id",
  "fileHome.management.action.rename": "إعادة تسمية",
  "fileHome.management.action.cancelRename": "إلغاء إعادة التسمية",
  "fileHome.management.action.unregister": "إلغاء التسجيل",
  "fileHome.management.action.cancelUnregister": "إلغاء عملية الإلغاء",
  "fileHome.management.action.deleteBase": "حذف القاعدة",
  "fileHome.management.action.cancelDelete": "إلغاء الحذف",
  "fileHome.management.action.registerNewDb":
    "تسجيل كقاعدة بيانات جديدة",
  "fileHome.management.action.replaceActiveDb":
    "استبدال القاعدة النشطة",
  "fileHome.management.action.mergeIntoActiveDb":
    "دمج في القاعدة النشطة",
  "fileHome.management.action.copyArtifactId": "نسخ artifact_id",
  "fileHome.management.action.delete": "حذف",
  "fileHome.management.action.removeSharedBase":
    "إزالة القاعدة المشتركة",
  "fileHome.management.action.cancelRemoveSharedBase": "إلغاء الإزالة",
  "fileHome.management.placeholderBaseName": "اسم عرض القاعدة",
  "fileHome.management.placeholderSharedBaseName":
    "اسم القاعدة المشتركة",
  "fileHome.management.confirmBackup": "تأكيد النسخ الاحتياطي",
  "fileHome.management.confirmHideFromAgent":
    "تأكيد الإخفاء عن الوكيل",
  "fileHome.management.confirmShowToAgent": "تأكيد الإظهار للوكيل",
  "fileHome.management.confirmShareBase":
    "تأكيد مشاركة القاعدة",
  "fileHome.management.confirmOpenMergeFlow": "فتح تدفّق الدمج",
  "fileHome.management.confirmGeneric": "تأكيد",
  "fileHome.management.removeSharedBasePrompt":
    "إزالة {name} من «المشاركة معي»؟",
  "fileHome.management.pendingMerge":
    "فتح تدفّق الدمج للقاعدة {name}؟",
  "fileHome.management.pendingShare":
    "فتح المشاركة للقاعدة {name}؟",
  "fileHome.management.pendingBackup":
    "إنشاء نسخة احتياطية يدوية للقاعدة {name}؟",
  "fileHome.management.pendingHide":
    "إخفاء {name} عن أدوات الوكيل؟",
  "fileHome.management.pendingShow":
    "إظهار {name} لأدوات الوكيل؟",
  "fileHome.management.pendingMergeDetail":
    "يفتح هذا شاشة الدمج لهذه القاعدة ويُبقي القاعدة النشطة دون تغيير حتى تؤكّد الدمج هناك.",
  "fileHome.management.pendingShareDetail":
    "قد تبدّل المشاركة الملكية التشغيلية إلى هذه القاعدة أولاً لتفتح شاشة المشاركة على القاعدة العاملة الصحيحة.",
  "fileHome.management.pendingBackupDetail":
    "ستُنشأ نسخة احتياطية يدوية جديدة لهذه القاعدة فورًا.",
  "fileHome.management.pendingBackupDetailShared":
    "ستُنشأ نسخة احتياطية من النسخة الموثوقة لهذه القاعدة المشتركة.",
  "fileHome.management.pendingHideDetail":
    "ستتوقف القاعدة عن الظهور في قوائم القواعد المحلية المرئية للوكيل.",
  "fileHome.management.pendingShowDetail":
    "ستتاح القاعدة مجدّدًا في قوائم القواعد المحلية المرئية للوكيل.",
  "fileHome.management.pendingHideDetailShared":
    "ستتوقف هذه القاعدة المشتركة عن الظهور في قوائم القواعد المشتركة المرئية للوكيل.",
  "fileHome.management.pendingShowDetailShared":
    "ستتاح هذه القاعدة المشتركة مجدّدًا في قوائم القواعد المشتركة المرئية للوكيل.",
  "fileHome.management.pendingAgentAccessToRead":
    "تعيين {name} للوكيل للقراءة فقط؟",
  "fileHome.management.pendingAgentAccessToHidden":
    "إخفاء {name} عن أدوات الوكيل؟",
  "fileHome.management.pendingAgentAccessToWrite":
    "السماح للوكيل بالوصول الكامل إلى {name}؟",
  "fileHome.management.pendingAgentAccessToReadDetail":
    "يمكن للوكيل قراءة هذه القاعدة والتبديل إليها دون الكتابة إلى SQLite الخاص بها.",
  "fileHome.management.pendingAgentAccessToHiddenDetail":
    "ستتوقف القاعدة عن الظهور في قوائم القواعد المحلية المرئية للوكيل.",
  "fileHome.management.pendingAgentAccessToWriteDetail":
    "يمكن للوكيل قراءة هذه القاعدة وتعديلها عبر أدوات MCP.",
  "fileHome.management.confirmAgentAccessToRead": "تأكيد القراءة فقط",
  "fileHome.management.confirmAgentAccessToHidden": "تأكيد الإخفاء عن الوكيل",
  "fileHome.management.confirmAgentAccessToWrite": "تأكيد الوصول الكامل",
  "fileHome.management.noticeAgentAccessUpdated":
    "وصول الوكيل إلى {name} أصبح الآن {mode}.",
  "fileHome.management.noticeSharedBaseRenamed":
    "تمت إعادة تسمية القاعدة المشتركة إلى «{name}».",
  "fileHome.management.noticeSharedBaseBackupCreated":
    "تم إنشاء نسخة احتياطية يدوية {filename}.",
  "fileHome.management.noticeSharedBaseVisibleToAgent":
    "أصبحت {name} مرئية لأدوات الوكيل مرة أخرى.",
  "fileHome.management.noticeSharedBaseHiddenFromAgent":
    "أصبحت {name} مخفية عن أدوات الوكيل الآن.",

  "bases.projectionState.active": "نشِطة",
  "bases.projectionState.ready": "جاهزة",
  "bases.projectionState.public": "عامة",
  "bases.projectionState.degraded": "متدهورة",
  "bases.projectionState.offline": "غير متّصلة",
  "bases.projectionState.local": "محلية",

  "graph.canvas.changeGraphView": "تغيير عرض الرسم البياني",
  "graph.canvas.graphViewLabel": "عرض الرسم البياني: {view}",
  "graph.canvas.graphViewMermaid": "Mermaid",
  "graph.canvas.freeze": "تجميد الرسم البياني أثناء الاستكشاف",
  "graph.canvas.unfreeze":
    "إلغاء تجميد الرسم البياني والمزامنة مع الملاحظة المحددة",
  "graph.canvas.freezeExpanded":
    "تجميد الرسم البياني الموسّع أثناء الاستكشاف",
  "graph.canvas.unfreezeExpanded":
    "إلغاء تجميد الرسم البياني الموسّع والمزامنة مع الملاحظة المحددة",
  "graph.canvas.refreshScope": "تحديث نطاق الرسم البياني الحالي",
  "graph.canvas.rebuildFromSelection":
    "إعادة بناء الرسم البياني انطلاقًا من الملاحظة المحددة",
  "graph.canvas.stale": "الرسم البياني قديم",
  "graph.sharedBase.partialPageGraphLoad":
    "تم تحميل روابط الرسم البياني الدلالية لـ {loaded} من أصل {requested} صفحة. قد تكون بعض الروابط مفقودة.",
  "graph.canvas.hideNodeLabels": "إخفاء تسميات العقد",
  "graph.canvas.showNodeLabels": "إظهار تسميات العقد",
  "graph.canvas.hideTagNodes": "إخفاء عقد الوسوم",
  "graph.canvas.showTagNodes": "إظهار عقد الوسوم",
  "graph.canvas.disableCameraOrbit": "تعطيل مدار الكاميرا",
  "graph.canvas.enableCameraOrbit": "تفعيل مدار الكاميرا",
  "graph.canvas.expandFullScreen":
    "توسيع الرسم البياني إلى ملء الشاشة",
  "graph.canvas.zoomToFitAll":
    "تكبير لاحتواء كل العقد",
  "graph.canvas.savingMermaidAttachment":
    "جارٍ حفظ مرفق Mermaid SVG",
  "graph.canvas.saveMermaidAttachment": "حفظ مرفق Mermaid SVG",
  "graph.canvas.depthAriaLabel": "عمق الرسم البياني",
  "graph.canvas.depthTitle": "عمق الرسم البياني: {depth}",
  "graph.canvas.loadingGraphView":
    "جارٍ تحميل عرض الرسم البياني…",
  "graph.canvas.savedMermaidAttachment": "تم حفظ مرفق Mermaid: ",
  "graph.canvas.couldNotRenderMermaid":
    "تعذّر عرض مرفق Mermaid.",
  "graph.canvas.couldNotCaptureMermaidSvg":
    "تعذّر التقاط Mermaid SVG من العرض الحالي.",

  "bases.detail.notes": "ملاحظات",
  "bases.detail.nodes": "عقد",
  "bases.detail.edges": "روابط",
  "bases.detail.size": "حجم",
  "bases.detail.type": "النوع",
  "bases.detail.owner": "المالك",
  "bases.detail.baseId": "معرّف القاعدة",
  "bases.detail.entryId": "معرّف السجل",
  "bases.detail.grantId": "معرّف المنح",
  "bases.detail.artifactId": "معرّف الأثر",
  "bases.detail.sourceBase": "القاعدة المصدر",
  "bases.detail.sourceBaseId": "معرّف القاعدة المصدر",
  "bases.detail.registered": "مسجَّلة",
  "bases.detail.created": "أُنشئت",
  "bases.detail.activated": "مفعَّلة",
  "bases.detail.expires": "تنتهي",
  "bases.detail.activeOnly": "{active} نشِطة",
  "bases.detail.activeOfTotal": "{active} نشِطة / {total} الإجمالي",
  "bases.kindLabel.scopedExport": "تصدير محدود",
  "bases.kindLabel.backup": "نسخة احتياطية",
  "bases.action.deleteBackup": "حذف النسخة الاحتياطية",
  "bases.action.deleteExport": "حذف التصدير",
  "bases.confirm.deleteArtifact": "حذف «{label}»؟",

  "settings.section.software.title": "الإصدار المثبَّت",
  "settings.section.software.description":
    "حافظ على تحديث البرنامج لأداء أفضل",
  "settings.section.software.checkForUpdates": "البحث عن تحديثات",
  "settings.section.software.upToDate": "محدَّث",
  "settings.section.software.sourceGitSha": "نسخة المصدر",
  "settings.section.software.runtimeBuildId": "بناء وقت التشغيل",
  "settings.section.software.check": "تحقَّق",
  "settings.section.software.update": "تحديث",
  "settings.section.software.installing": "جاري التثبيت...",
  "settings.section.software.checking": "جاري التحقق...",
  "settings.section.software.installedMessage":
    "تم تثبيت التحديث. جارٍ إعادة تشغيل التطبيق الآن...",
  "settings.embeddingBootstrap.pending.hosted":
    "جارٍ تجهيز تضمينات Locram المستضافة. يمكنك متابعة استخدام Locram؛ قد يكون البحث الدلالي محدودًا حتى اكتمال الإعداد.",
  "settings.embeddingBootstrap.pending.huggingface":
    "في انتظار إعداد تضمينات Hugging Face. يمكنك متابعة استخدام Locram؛ قد يكون البحث الدلالي محدودًا حتى اكتمال الإعداد.",
  "settings.embeddingBootstrap.pending.ollama":
    "جارٍ تجهيز بيئة التضمين المحلية (Ollama). يمكنك متابعة استخدام Locram؛ قد يكون البحث الدلالي محدودًا حتى اكتمال الإعداد.",
  "settings.embeddingBootstrap.running.hosted":
    "جارٍ جلب بيانات اعتماد Locram المستضافة. يمكنك متابعة استخدام Locram أثناء اكتمال الإعداد في الخلفية.",
  "settings.embeddingBootstrap.running.huggingface":
    "جارٍ التحقق من إعداد Hugging Face. يمكنك متابعة استخدام Locram أثناء اكتمال الإعداد في الخلفية.",
  "settings.embeddingBootstrap.running.ollama":
    "جارٍ تنزيل نموذج التضمين. قد يستغرق ذلك عدة دقائق. يمكنك الاستمرار في استخدام Locram أثناء الإعداد في الخلفية.",
  "settings.embeddingBootstrap.failed.hosted":
    "فشل إعداد Locram المستضاف: {error}. قد يبقى البحث الدلالي والتضمين التلقائي غير متاحين حتى تعيد تشغيل Locram.",
  "settings.embeddingBootstrap.failed.huggingface":
    "فشل إعداد Hugging Face: {error}. عيّن LOCRAM_EMBED_API_KEY وأعد تشغيل Locram، أو غيّر المزوّد عبر env.",
  "settings.embeddingBootstrap.failed.ollama":
    "فشل إعداد التضمين: {error}. قد يبقى البحث الدلالي والتضمين التلقائي غير متاحين حتى تعيد تشغيل Locram أو تثبّت Ollama يدويًا.",

  "settings.section.embedding.title": "مزوّد التضمين",
  "settings.section.embedding.description": "للبحث الدلالي.",
  "settings.embedding.loading": "جارٍ تحميل إعدادات التضمين...",
  "settings.embedding.loadFailed": "تعذّر تحميل إعدادات التضمين.",
  "settings.embedding.provider.locramHosted": "Locram المستضاف",
  "settings.embedding.provider.huggingFace": "Hugging Face",
  "settings.embedding.provider.ollama": "Ollama المحلي",
  "settings.embedding.huggingFaceToken.label": "رمز Hugging Face API",
  "settings.embedding.huggingFaceToken.description":
    "يُخزَّن محلياً ويُستخدم لطلبات التضمين إلى Hugging Face.",
  "settings.embedding.huggingFaceToken.placeholder": "hf_...",
  "settings.embedding.ollamaModel.label": "نموذج Ollama",
  "settings.embedding.ollamaModel.description":
    "اسم النموذج الذي يطلبه Locram من بيئة Ollama المحلية.",
  "settings.embedding.ollamaUrl.label": "عنوان Ollama",
  "settings.embedding.ollamaUrl.description":
    "عنوان URL الأساسي لخادم Ollama المحلي الذي يجب أن يتصل به Locram.",
  "settings.embedding.action.save": "حفظ",
  "settings.embedding.action.saving": "جارٍ الحفظ...",
  "settings.embedding.restartNotice":
    "أعد تشغيل بيئة سطح المكتب بعد تغيير مزوّد التضمين.",
  "settings.embedding.readyNotice": "إعدادات التضمين جاهزة.",
  "settings.embedding.toast.saved": "تم حفظ إعدادات التضمين.",
  "settings.embedding.toast.saveFailed": "تعذّر حفظ إعدادات التضمين.",

  "settings.section.network.title": "الاتصال",
  "settings.section.network.description":
    "تحكم في المرحّل العام المُدار لهذا الجهاز.",
  "settings.section.network.reconnect": "إعادة الاتصال",
  "settings.section.network.reconnecting": "جاري إعادة الاتصال...",
  "settings.section.network.connect": "اتصال",
  "settings.section.network.connecting": "جاري الاتصال...",
  "settings.section.network.disconnect": "قطع الاتصال",
  "settings.section.network.disconnecting": "جاري قطع الاتصال...",
  "settings.section.network.reconnectAria": "إعادة اتصال الشبكة",
  "settings.section.network.connectAria": "اتصال الشبكة",
  "settings.section.network.disconnectAria": "قطع اتصال الشبكة",

  "settings.section.account.showActivationUrl": "إظهار رابط التفعيل",
  "settings.section.account.activationUrl": "رابط التفعيل",
  "settings.section.account.browserActivationCheck":
    "يتم التحقق من التفعيل تلقائيًا. أكمل تسجيل الدخول في المتصفح وسيتابع Locram Desktop هنا.",
  "settings.section.account.browserActivationTransfer":
    "Pro نشط على جهاز آخر. أكّد النقل في المتصفح ثم عُد هنا لإكمال التفعيل على هذا الجهاز",
  "settings.section.account.needBrowserLink": "هل تحتاج رابط المتصفح؟",
  "settings.section.account.openActivationLink": "افتح رابط التفعيل",
  "settings.section.account.forgetDeviceConfirm":
    "هل تريد نسيان هذا الجهاز؟ ستحتاج إلى تفعيله مجددًا قبل استخدام ميزات الشبكة المُدارة.",

  "settings.mcp.stdio.title": "MCP المحلي (STDIO)",
  "settings.mcp.stdio.description":
    "انسخ مقطع إعداد جاهز للتطبيق الذي تستخدمه على هذا الجهاز.",
  "settings.mcp.stdio.loading": "جارٍ التحقق من مشغّل MCP المكتبي.",
  "settings.mcp.stdio.unavailable":
    "تعذّر تحميل حالة مشغّل MCP المكتبي.",
  "settings.mcp.stdio.launcherMissing":
    "مشغّل MCP المكتبي غير جاهز بعد. أغلق Locram Desktop وافتحه مجددًا لتشغيل إصلاح بدء التشغيل، ثم انسخ المقطع مرة أخرى.",
  "settings.mcp.stdio.snippet.json.title": "Cursor / Claude (JSON)",
  "settings.mcp.stdio.snippet.json.description":
    "ألصق هذا في إعدادات MCP داخل Cursor أو Claude Desktop.",
  "settings.mcp.stdio.snippet.yaml.title": "Codex (TOML)",
  "settings.mcp.stdio.snippet.yaml.description":
    "ألصق هذا في ~/.codex/config.toml.",
  "settings.mcp.http.title": "MCP عن بُعد (HTTP)",
  "settings.mcp.http.description.free":
    "يفتح Pro وصول MCP عن بُعد عبر HTTP للوكلاء خارج هذا الجهاز",
  "settings.mcp.http.description.setup":
    "انسخ عنوان MCP إلى الموصل، ثم وافق على طلبات تسجيل الدخول هنا.",
  "settings.mcp.http.description.operational":
    "مرحل MCP على الجهاز جاهز.",
  "settings.mcp.http.urlLabel": "عنوان MCP",
  "settings.mcp.http.action.upgrade": "الترقية إلى Pro",
  "settings.mcp.http.action.copyMcpUrl": "نسخ عنوان MCP",
  "settings.mcp.http.action.connect": "اتصال",
  "settings.mcp.http.action.connecting": "جارٍ الاتصال...",
  "settings.mcp.http.action.disconnect": "قطع الاتصال",
  "settings.mcp.http.action.disconnecting": "جارٍ قطع الاتصال...",
  "settings.mcp.http.action.reconnect": "إعادة الاتصال",
  "settings.mcp.http.action.reconnecting": "جارٍ إعادة الاتصال...",
  "settings.mcp.http.browserOpened": "تم فتح المتصفح.",
  "settings.mcp.http.browserBlocked":
    "حظر المتصفح الصفحة. افتحها يدويًا.",
  "settings.mcp.pendingApproval.title": "موافقات معلّقة",
  "settings.mcp.pendingApproval.description":
    "وافق على طلبات OAuth من موصلات MCP البعيدة لهذا الجهاز.",
  "settings.mcp.pendingApproval.modal.title": "الموافقة على دخول الموصل",
  "settings.mcp.pendingApproval.modal.description":
    "يطلب موصل بعيد تسجيل الدخول عبر هذا الجهاز. وافق فقط إذا بدأت أنت عملية الدخول.",
  "settings.mcp.pendingApproval.modal.redirectHost": "إعادة توجيه تسجيل الدخول",
  "settings.mcp.pendingApproval.modal.details": "تفاصيل الطلب",
  "settings.mcp.pendingApproval.loading": "جارٍ التحقق من الموافقات المعلّقة...",
  "settings.mcp.pendingApproval.empty": "لا توجد موافقات موصل معلّقة.",
  "settings.mcp.pendingApproval.error":
    "تعذّر تحميل الموافقات المعلّقة. تحقق من وصول المرحل وحاول مرة أخرى.",
  "settings.mcp.pendingApproval.clientId": "معرّف العميل",
  "settings.mcp.pendingApproval.redirectUri": "عنوان إعادة التوجيه",
  "settings.mcp.pendingApproval.expiresAt": "ينتهي",
  "settings.mcp.pendingApproval.approve": "موافقة",
  "settings.mcp.pendingApproval.approving": "جارٍ الموافقة...",
  "settings.mcp.pendingApproval.notNow": "ليس الآن",
  "settings.mcp.tab.pendingBadge": "{count} معلّق",
  "settings.mcp.pendingApproval.toast.approved":
    "تم إرسال الموافقة. يجب أن يكتمل تسجيل الدخول في المتصفح قريبًا.",
  "settings.mcp.pendingApproval.toast.approveFailed":
    "تعذّرت الموافقة على طلب الموصل.",
  "settings.mcp.connectors.title": "الموصلات",
  "settings.mcp.connectors.description": "إدارة عملاء MCP البعيدين لهذا الجهاز.",
  "settings.mcp.connectors.loading": "جارٍ تحميل الموصلات...",
  "settings.mcp.connectors.empty": "لا توجد موصلات MCP بعيدة بعد.",
  "settings.mcp.connectors.error":
    "تعذّر تحميل الموصلات. تحقق من relay وحاول مرة أخرى.",
  "settings.mcp.connectors.url": "URL",
  "settings.mcp.connectors.status.pending": "معلّق",
  "settings.mcp.connectors.status.active": "نشط",
  "settings.mcp.connectors.status.authorized": "مصرّح",
  "settings.mcp.connectors.status.expired": "منتهٍ",
  "settings.mcp.connectedSessions.title": "الموصلات المعتمدة",
  "settings.mcp.connectedSessions.description":
    "عملاء MCP البعيدون المعتمدون لهذا الجهاز. ألغِ الوصول عندما يحتاج الموصل إلى تسجيل دخول جديد.",
  "settings.mcp.connectedSessions.loading": "جارٍ تحميل الموصلات المعتمدة...",
  "settings.mcp.connectedSessions.empty": "لا توجد موصلات بعيدة معتمدة بعد.",
  "settings.mcp.connectedSessions.error":
    "تعذّر تحميل الموصلات المعتمدة. تحقق من relay وحاول مرة أخرى.",
  "settings.mcp.connectedSessions.details": "تفاصيل الموصل",
  "settings.mcp.connectedSessions.approvedAt": "تمت الموافقة",
  "settings.mcp.connectedSessions.accessExpiresAt": "ينتهي الوصول",
  "settings.mcp.connectedSessions.revoke": "إلغاء",
  "settings.mcp.connectedSessions.revoking": "جارٍ الإلغاء...",
  "settings.mcp.connectedSessions.revokeAll": "إلغاء الكل",
  "settings.mcp.connectedSessions.revokingAll": "جارٍ إلغاء الكل...",
  "settings.mcp.connectedSessions.state.active": "نشط",
  "settings.mcp.connectedSessions.state.refreshable": "مصرّح",
  "settings.mcp.connectedSessions.state.expired": "منتهٍ",
  "settings.mcp.connectedSessions.toast.revoked": "تم إلغاء وصول الموصل.",
  "settings.mcp.connectedSessions.toast.revokeFailed": "تعذّر إلغاء هذا الموصل.",
  "settings.mcp.connectedSessions.toast.revokedAll": "تم إلغاء وصول جميع الموصلات.",
  "settings.mcp.connectedSessions.toast.revokeAllFailed": "تعذّر إلغاء جميع الموصلات.",
  "settings.mcp.toolSurface.title": "الأدوات المتاحة للوكلاء",
  "settings.mcp.toolSurface.descriptionManage":
    "اختر الأدوات الاختيارية المتاحة لوكلاء الذكاء الاصطناعي.",
  "settings.mcp.toolSurface.descriptionReadOnly":
    "يتضمن Free الأدوات الأساسية. يضيف Pro قواعد متعددة والمشاركة والتحديثات المُدارة وأدوات وكلاء متقدمة",
  "settings.mcp.toolSurface.loading": "جارٍ التحميل",
  "settings.mcp.toolSurface.visibleCount": "ظاهرة: {count}",
  "settings.mcp.toolSurface.required": "أساسية",
  "settings.mcp.toolSurface.destructive": "تنبيه",
  "settings.mcp.toolSurface.toolCount": "أدوات: {count}",
  "settings.mcp.toolSurface.hideGroup": "إخفاء {label}",
  "settings.mcp.toolSurface.showGroup": "إظهار {label}",
  "settings.mcp.toolSurface.loadError":
    "تعذّر تحميل إعدادات رؤية الأدوات.",

  "settings.status.active": "نشِط",
  "settings.status.live": "متصل",
  "settings.status.connected": "متصل",
  "settings.status.disconnected": "غير متصل",
  "settings.status.pro": "Pro",
  "settings.status.admin": "مسؤول",
  "settings.status.free": "Free",
  "settings.status.activationPending": "بانتظار التفعيل",
  "settings.status.activationTransferred": "تم نقل التفعيل",
  "settings.status.connecting": "جارٍ الاتصال",
  "settings.status.reconnecting": "إعادة الاتصال",
  "settings.status.pending": "قيد الانتظار",
  "settings.status.started": "بدأ",
  "settings.status.enrolled": "مسجَّل",
  "settings.status.configured": "مهيَّأ",
  "settings.status.notConfigured": "غير مهيَّأ",
  "settings.status.notActivated": "غير مفعَّل",
  "settings.status.activationRequired": "يلزم التفعيل",
  "settings.status.reauthRequired": "تلزم إعادة المصادقة",
  "settings.status.unknown": "غير معروف",
  "settings.status.failedRetryable": "فشل (قابل لإعادة المحاولة)",
  "settings.status.grace": "فترة سماح",
  "settings.status.interrupted": "منقطع",
  "settings.status.missing": "غير موجود",
  "settings.status.offline": "غير متصل",
  "settings.status.stale": "قديم",
  "settings.status.disabled": "معطَّل",
  "settings.status.expired": "منتهي",
  "settings.status.failed": "فشل",
  "settings.status.failedTerminal": "فشل نهائي",
  "settings.status.invalid": "غير صالح",
  "settings.status.loaded": "محمل",
  "settings.status.ready": "جاهز",
  "settings.status.running": "قيد التشغيل",
  "settings.status.unloaded": "غير محمل",
  "settings.status.degraded": "متدهور",
  "settings.status.conflict": "تعارض",
  "settings.status.needsRepair": "يحتاج إصلاحًا",
  "settings.status.dependencyMissing": "اعتمادية مفقودة",
  "settings.status.dependencyIncomplete": "اعتمادية غير مكتملة",
  "settings.status.revoked": "ملغى",
  "settings.status.unsupported": "غير مدعوم",

  "settings.updater.unavailable":
    "محدِّث سطح المكتب متاح في التطبيق المُعبَّأ.",
  "settings.updater.available": "التحديث {version} متاح.",
  "settings.updater.noNewer":
    "لا يتوفر تحديث داخل التطبيق أحدث الآن.",
  "settings.updater.loadFailed":
    "تعذّر تحميل حالة محدِّث سطح المكتب.",
  "settings.updater.alreadyLatest":
    "أنت بالفعل على أحدث إصدار داخل التطبيق لهذه القناة.",
  "settings.updater.installingVersion":
    "جارٍ تثبيت {version} من تغذية القناة الحالية...",
  "settings.updater.installedVersion":
    "تم تثبيت التحديث {version}. جارٍ إعادة تشغيل التطبيق الآن...",
  "settings.updater.failed": "فشل تحديث سطح المكتب.",

  "settings.mcp.family.basicNotesGraph.label": "الملاحظات والرسم البياني",
  "settings.mcp.family.basicNotesGraph.description":
    "الأدوات الأساسية للملاحظات والبحث والروابط. مفعّلة دائمًا.",
  "settings.mcp.family.multiBaseWorkingSet.label": "قواعد متعددة",
  "settings.mcp.family.multiBaseWorkingSet.description":
    "العمل مع عدة قواعد معرفية في الوقت نفسه.",
  "settings.mcp.family.localBaseAdministration.label": "إدارة القواعد المحلية",
  "settings.mcp.family.localBaseAdministration.description":
    "إنشاء وإعادة تسمية وتبديل وحذف قواعدك المحلية.",
  "settings.mcp.family.artifactsExport.label": "التصدير",
  "settings.mcp.family.artifactsExport.description":
    "تصدير ملاحظاتك ومراجعة الملفات المُصدَّرة.",
  "settings.mcp.family.mergeTransfer.label": "النقل والدمج",
  "settings.mcp.family.mergeTransfer.description":
    "نقل الملاحظات أو دمجها بين القواعد مع خطوات مراجعة.",
  "settings.mcp.family.backupsRestore.label": "النسخ الاحتياطية",
  "settings.mcp.family.backupsRestore.description":
    "إنشاء وإدارة واستعادة النسخ الاحتياطية للقاعدة.",
  "settings.mcp.family.smartFolders.label": "المجلدات الذكية",
  "settings.mcp.family.smartFolders.description":
    "حفظ وإعادة استخدام مجموعات الملاحظات المُصفّاة.",
  "settings.mcp.family.sourceScopedWorkflows.label": "النشر",
  "settings.mcp.family.sourceScopedWorkflows.description":
    "نشر الملاحظات عبر خطوات المراجعة والموافقة.",
  "settings.mcp.family.diagnostics.label": "التشخيص",
  "settings.mcp.family.diagnostics.description":
    "فحص تفصيلي للرسم البياني وفهرس البحث.",
  "settings.mcp.family.destructiveTools.label": "حذف واستبدال",
  "settings.mcp.family.destructiveTools.description":
    "أدوات تحذف البيانات أو تستبدلها. استخدمها بحذر.",
  "settings.mcp.family.indexingMaintenance.label": "فهرس البحث",
  "settings.mcp.family.indexingMaintenance.description":
    "صيانة الفهرس الذي يُستخدم للبحث في الملاحظات.",
  "settings.mcp.family.internal.label": "أدوات داخلية",
  "settings.mcp.family.internal.description":
    "أدوات مخفية للتطوير والميزات المستقبلية.",

  "settings.toast.activationUpdated": "تم تحديث التفعيل.",
  "settings.toast.activationAutoRepairFailed":
    "تم حفظ التفعيل، لكن تعذر تفعيل MCP تلقائيًا. افتح الصيانة وشغّل الإصلاح.",
  "settings.toast.disconnected": "تم قطع الاتصال.",
  "settings.toast.copiedToClipboard": "تم النسخ إلى الحافظة.",
  "settings.toast.copyFailed": "تعذّر النسخ إلى الحافظة.",
  "settings.toast.signedOutOnDevice": "تم تسجيل الخروج من هذا الجهاز.",
  "settings.toast.deviceForgotten": "تم نسيان هذا الجهاز.",
  "settings.toast.mcpVisibilityUpdated": "تم تحديث ظهور أدوات MCP.",
  "settings.toast.mcpVisibilityFailed": "تعذر تحديث ظهور أدوات MCP.",
  "settings.toast.noteLanguageUpdated": "تم حفظ لغة الملاحظات.",
  "settings.toast.noteLanguageFailed": "تعذر حفظ لغة الملاحظات.",

  "settings.activation.failure.sessionExpired": "انتهت صلاحية جلسة التفعيل",
  "settings.activation.failure.sessionRedeemed":
    "تم استخدام جلسة التفعيل بالفعل",
  "settings.activation.failure.sessionUnredeemable":
    "تعذر استرداد جلسة التفعيل",
  "settings.activation.failure.transferRequired":
    "Pro نشط على جهاز آخر. أكّد النقل في المتصفح لنقل التفعيل إلى هذا الجهاز",
  "settings.activation.failure.activationTransferred": "تم نقل التفعيل",
  "settings.activation.failure.retryable": "يمكن إعادة محاولة التفعيل",
  "settings.activation.failure.terminal": "لا يمكن متابعة التفعيل",

  "settings.account.localWorkspace": "مساحة عمل محلية",
  "settings.account.notConnected": "غير متصل",
  "settings.account.connected": "متصل",
  "settings.account.subscriptionRequired": "لا توجد اشتراك Pro",
  "settings.account.planFree": "Free",
  "settings.account.planTrial": "Trial",
  "settings.account.planPro": "Pro",
  "settings.account.planSuffix": "خطة {plan}",
  "settings.account.statusUnknown": "غير معروف",

  "settings.updater.action.installing": "جارٍ التثبيت...",
  "settings.updater.action.checking": "جارٍ التحقق...",
  "settings.updater.action.update": "تحديث",
  "settings.updater.action.upToDate": "محدّث",
  "settings.updater.action.check": "تحقق",

  "settings.networkStatus.reauthMessage":
    "سجّل الدخول مرة أخرى لاستعادة جلسة سطح المكتب ومتابعة ميزات الشبكة المُدارة.",
  "settings.networkStatus.activationState": "التفعيل: {state}.",
  "settings.entitlement.expired":
    "انتهت صلاحية اشتراك هذا الجهاز. سجّل الدخول مجددًا لتحديث التفعيل. ستبقى الملاحظات المحلية قابلة للقراءة، لكن ميزات الشبكة المُدارة ستكون غير متاحة.",
  "settings.entitlement.transferred":
    "تم نقل تفعيل Pro إلى جهاز آخر. ستظل الملاحظات المحلية قابلة للقراءة هنا، لكن ميزات الشبكة المُدارة ستبقى معطلة حتى تعيد تفعيل هذا الجهاز.",
  "settings.entitlement.revoked":
    "تم سحب هذا الاشتراك. سجّل الدخول مجددًا أو تواصل مع الدعم قبل إعادة توصيل ميزات الشبكة المُدارة.",
  "settings.entitlement.invalid":
    "تعذر التحقق من إثبات الاشتراك المحفوظ. سجّل الدخول مجددًا لاستبداله بترخيص موقّع جديد.",
  "settings.entitlement.missing":
    "لم ينتج التفعيل entitlement lease موقّعًا بعد. سجّل الدخول مجددًا لإكمال تفعيل الجهاز قبل استخدام ميزات الشبكة المُدارة.",
  "settings.entitlement.grace":
    "جدّد قبل انتهاء فترة السماح لتجنب انقطاع الشبكة المُدارة.",
  "settings.entitlement.waitingForLease":
    "لم يتم استلام entitlement lease الموقّع بعد.",
  "settings.entitlement.createdAfterActivation":
    "يتم إنشاء entitlement lease الموقّع بعد اكتمال التفعيل.",

  "settings.connect.started": "جارٍ توصيل المُرحِّل.",
  "settings.connect.alreadyRunning": "المُرحِّل يعمل بالفعل.",
  "settings.connect.failed": "فشل بدء المُرحِّل.",
  "settings.connect.disabled": "الوصول معطّل.",
  "settings.connect.enrollmentRequired":
    "يلزم التفعيل قبل أن يتمكن هذا الجهاز من الاتصال.",
  "settings.connect.reauthRequired":
    "سجّل الدخول مرة أخرى لاستعادة جلسة سطح المكتب قبل الاتصال.",
  "settings.connect.unsupported": "وقت التشغيل غير مدعوم.",
  "settings.connect.restarted": "تمت إعادة تشغيل المُرحِّل.",

  "bases.error.loadBases": "تعذر تحميل القواعد",
  "bases.error.switchBase": "تعذر تبديل القاعدة",
  "bases.error.replaceActiveBase": "تعذر استبدال القاعدة النشطة",
  "bases.tooltips.replaceActiveBase": "استبدال القاعدة الحالية",
  "bases.error.createBase": "تعذر إنشاء القاعدة",
  "bases.error.renameBase": "تعذر إعادة تسمية القاعدة",
  "bases.error.unregisterBase": "تعذر إلغاء تسجيل القاعدة",
  "bases.error.deleteBase": "تعذر حذف القاعدة",
  "bases.error.updateMcpVisibility": "تعذر تحديث ظهور MCP",
  "bases.error.updateSharedMcpVisibility":
    "تعذر تحديث ظهور MCP للقاعدة المشتركة",
  "bases.error.renameSharedBase": "تعذر إعادة تسمية القاعدة المشتركة",
  "bases.error.removeSharedBase": "تعذر إزالة القاعدة المشتركة",
  "bases.error.backupSharedBase":
    "تعذر إنشاء نسخة احتياطية للقاعدة المشتركة",
  "bases.error.backupBase": "تعذر إنشاء نسخة احتياطية للقاعدة",
  "bases.error.deleteBackup": "تعذر حذف النسخة الاحتياطية",
  "bases.error.deleteExport": "تعذر حذف التصدير",
  "bases.error.sharingRequiresPro":
    "تتطلب المشاركة اشتراك Pro نشطًا.",
  "bases.error.prepareSharing": "تعذر تجهيز القاعدة للمشاركة.",
  "bases.placeholder.baseName": "اسم القاعدة",
  "bases.placeholder.baseDisplayName": "اسم العرض للقاعدة",
  "bases.confirm.unregister":
    "هل تريد إلغاء تسجيل «{name}»؟ سيبقى الملف على القرص.",
  "bases.confirm.unregisterLabel": "إلغاء التسجيل",
  "bases.confirm.delete": "هل تريد حذف «{name}» وملفه؟",
  "bases.confirm.deleteLabel": "حذف القاعدة",
  "bases.confirm.removeFromShared":
    "إزالة «{name}» من المشاركة معي؟",
  "bases.builtIn.governance": "إدارة الرسم",
  "bases.builtIn.documentation": "التوثيق",
  "bases.builtIn.adminPanel": "لوحة الإدارة",
  "bases.builtIn.statusUnavailable": "لا توجد قواعد مدمجة متاحة.",
  "bases.badge.inUse": "نشطة",
  "bases.badge.mcpOff": "MCP معطّل",
  "bases.badge.agentRead": "الوكيل: قراءة",
  "bases.sessionState.revoked": "الجلسة ملغاة",
  "bases.sessionState.expired": "انتهت الجلسة",
  "bases.sessionState.unavailable": "لا توجد نسخة محلية",
  "bases.builtIn.metric.version": "الإصدار",
  "bases.builtIn.metric.pages": "الصفحات",
  "bases.builtIn.metric.read": "قراءة",
  "bases.builtIn.metric.methods": "الطرق",
  "bases.builtIn.metric.status": "الحالة",
  "bases.builtIn.metric.surfaces": "السطوح",
  "bases.builtIn.metric.actions": "الإجراءات",
  "bases.builtIn.detail.status": "الحالة",
  "bases.builtIn.detail.minimumClient": "الحد الأدنى للعميل",
  "bases.builtIn.detail.visibility": "الظهور",
  "bases.builtIn.detail.auth": "التفويض",
  "bases.builtIn.detail.updated": "آخر تحديث",
  "bases.builtIn.detail.projection": "الإسقاط",
  "bases.builtIn.detail.hostname": "اسم المضيف",
  "bases.builtIn.detail.defaultPage": "الصفحة الافتراضية",
  "bases.builtIn.detail.roles": "الأدوار",
  "bases.builtIn.detail.invalidTokens": "الرموز غير الصالحة",
  "bases.builtIn.detail.updateAuthority": "صلاحية التحديث",
  "bases.builtIn.detail.governanceAuthority": "صلاحية الحوكمة",
  "bases.builtIn.detail.registryAuthority": "صلاحية السجل",
  "bases.builtIn.boolean.yes": "نعم",
  "bases.builtIn.boolean.no": "لا",
  "bases.builtIn.boolean.enabled": "ممكَّن",
  "bases.builtIn.boolean.disabled": "معطَّل",

  "common.copyAction": "نسخ «{label}»",

  "network.stats.nodes": "العقد",
  "network.stats.links": "الروابط",
  "network.stats.size": "الحجم",
  "network.stats.activeOf": "{active} نشط / {total} الإجمالي",
  "network.detail.entryId": "entry_id",
  "network.detail.recipient": "المستلم",
  "network.detail.baseId": "base_id",
  "network.detail.grantId": "grant_id",
  "network.detail.created": "أنشئت",
  "network.detail.activated": "نشطت",
  "network.detail.expires": "تنتهي",
  "network.detail.path": "المسار",
  "network.empty.enrollNetwork":
    "سجل في شبكة الوسيط لإدارة القواعد المشتركة.",
  "network.empty.sharingRequiresPro":
    "تتطلب المشاركة اشتراك Pro نشطًا.",
  "network.empty.noManagedShares": "لا توجد قواعد مشتركة مُدارة بعد.",

  "network.grantState.active": "نشط",
  "network.grantState.created": "تم الإنشاء",
  "network.grantState.expired": "منتهي",
  "network.grantState.pending": "غير مقبول",
  "network.grantState.revoked": "ملغى",
  "network.activationState.active": "نشط",
  "network.activationState.created": "تم الإنشاء",
  "network.activationState.pending": "غير مقبول",
  "network.permission.read": "قراءة",
  "network.permission.write": "كتابة",
  "network.permission.admin": "مسؤول",

  "sharing.owner.title": "مشاركة القاعدة",
  "sharing.owner.badge": "المالك",
  "sharing.owner.subtitle":
    "إدارة منح shared-base ودعوة المستلمين وضبط مستويات الوصول.",
  "sharing.owner.close": "إغلاق مشاركة القاعدة",
  "sharing.owner.createSection.title": "إنشاء منحة مشاركة قاعدة",
  "sharing.owner.createSection.description":
    "اختر قاعدة محددة وحدد الصلاحية وتاريخ الانتهاء قبل منح الوصول للمستلم.",
  "sharing.owner.grantsSection.title": "منح القواعد",
  "sharing.owner.grantsSection.description":
    "ابحث حسب القاعدة أو معرف المنحة أو المستلم أو وقت الإنشاء أو الانتهاء أو entry id أو الحالة.",
  "sharing.owner.inviteSection.title": "الدعوة",
  "sharing.owner.inviteSection.description":
    "خصص اسم المالك والرسالة قبل إنشاء أو نسخ رابط الدعوة.",
  "sharing.owner.detailsSection.title": "تفاصيل المنحة",
  "sharing.owner.detailsSection.description": "المعرفات وطوابع زمنية لدورة حياة المنحة.",
  "sharing.owner.field.base": "القاعدة",
  "sharing.owner.field.recipient": "هوية المستلم",
  "sharing.owner.field.recipientPlaceholder": "acct_123 أو e59dd763220443f8",
  "sharing.owner.field.expiresAt": "تنتهي في",
  "sharing.owner.field.expiresAtPlaceholder": "اختر التاريخ والوقت",
  "sharing.owner.field.capability": "الصلاحية",
  "sharing.owner.field.ownerDisplayName": "اسم عرض المالك",
  "sharing.owner.field.ownerDisplayNamePlaceholder": "Alex",
  "sharing.owner.field.inviteMessage": "رسالة الدعوة",
  "sharing.owner.field.inviteMessagePlaceholder":
    "استخدم وصول الكتابة للتعاون على القاعدة المشتركة.",
  "sharing.owner.action.createGrant": "إنشاء منحة",
  "sharing.owner.action.creating": "جارٍ الإنشاء…",
  "sharing.owner.action.mintInvite": "إنشاء دعوة",
  "sharing.owner.action.copyInvite": "نسخ الدعوة",
  "sharing.owner.action.copyMintedInvite": "نسخ رابط الدعوة المنشأ",
  "sharing.owner.action.revoke": "إلغاء",
  "sharing.owner.action.deleteGrant": "حذف",
  "sharing.owner.base.inUse": "قيد الاستخدام",
  "sharing.owner.base.noSelection": "لم يتم اختيار قاعدة",
  "sharing.owner.base.activeSuffix": "قيد الاستخدام",
  "sharing.owner.filter.allBases": "كل القواعد",
  "sharing.owner.filter.allStatuses": "كل الحالات",
  "sharing.owner.search.placeholder": "ابحث في منح القواعد",
  "sharing.owner.search.baseFilter": "تصفية المنح حسب القاعدة",
  "sharing.owner.search.statusFilter": "تصفية المنح حسب الحالة",
  "sharing.owner.inviteLink.title": "رابط الدعوة",
  "sharing.owner.grant.recipient": "المستلم",
  "sharing.owner.detail.grantId": "معرف المنحة",
  "sharing.owner.detail.entryId": "معرف الإدخال",
  "sharing.owner.detail.baseId": "معرف القاعدة",
  "sharing.owner.detail.created": "أُنشئ",
  "sharing.owner.detail.activated": "تم التفعيل",
  "sharing.owner.detail.inviteSent": "أُرسلت الدعوة",
  "sharing.owner.detail.expires": "تنتهي",
  "sharing.owner.dateTime.time": "الوقت",
  "sharing.owner.dateTime.clear": "مسح",
  "sharing.owner.dateTime.now": "الآن",
  "sharing.owner.readiness.enrollRequired":
    "سجّل في Brokered Network قبل إنشاء وصول shared-base.",
  "sharing.owner.readiness.accessDisabled":
    "الوصول المُدار معطّل. فعّل الوصول قبل إنشاء الدعوات.",
  "sharing.owner.readiness.noCredential":
    "بيانات اعتماد managed-public مفقودة. أكمل التسجيل قبل إنشاء الدعوات.",
  "sharing.owner.readiness.requiresManagedPublic":
    "إنشاء الدعوات يتطلب وصول managed-public. بدّل وضع الوصول أو أعد الاتصال.",
  "sharing.owner.notice.grantCreated": "تم إنشاء منحة مشاركة القاعدة.",
  "sharing.owner.notice.grantRevoked": "تم إلغاء منحة مشاركة القاعدة.",
  "sharing.owner.notice.grantDeleted": "تم حذف منحة مشاركة القاعدة.",
  "sharing.owner.notice.inviteReady": "الدعوة جاهزة.",
  "sharing.owner.notice.inviteCopied": "تم نسخ رابط الدعوة.",
  "sharing.owner.notice.createFailed": "تعذر إنشاء منحة مشاركة القاعدة.",
  "sharing.owner.notice.revokeFailed": "تعذر إلغاء منحة مشاركة القاعدة.",
  "sharing.owner.notice.deleteFailed": "تعذر حذف منحة مشاركة القاعدة.",
  "sharing.owner.notice.inviteFailed": "تعذر إنشاء دعوة مشاركة القاعدة.",
  "sharing.owner.notice.copyInviteFailed": "تعذر نسخ رابط الدعوة.",
  "sharing.owner.loading.grants": "جارٍ تحميل المنح…",
  "sharing.owner.error.loadGrants": "تعذر تحميل المنح: {message}",
  "sharing.owner.empty.noMatches": "لا توجد منح تطابق عوامل التصفية الحالية.",

  "bases.error.baseNotFound": "القاعدة غير موجودة",
};
