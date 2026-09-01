import type { DictionaryKey } from "@/i18n/dictionaries/en";

export const ru: Record<DictionaryKey, string> = {
  "app.signInGate.title": "Требуется вход",
  "app.signInGate.description":
    "Войдите в аккаунт Locram, прежде чем использовать desktop-приложение.",
  "app.signInGate.loadingTitle": "Проверка аккаунта",
  "app.signInGate.loadingDescription": "Подготовка статуса входа…",
  "app.signInGate.browserActivationCheck":
    "Завершите вход в браузере — Locram Desktop продолжит работу здесь.",
  "app.signInGate.waitingTitle": "Ожидание входа в браузере",
  "app.signInGate.errorTitle": "Не удалось подключиться к Locram",
  "app.signInGate.errorDescription":
    "Приложение не смогло проверить статус аккаунта. Проверьте подключение и попробуйте снова.",
  "app.signInGate.retry": "Повторить",
  "app.signInGate.openSignInPage": "Открыть страницу входа",

  "settings.tab.general": "Общие",
  "settings.tab.account": "Аккаунт",
  "settings.tab.maintenance": "Обслуживание",
  "settings.tab.mcp": "MCP",

  "settings.region.label": "Настройки",
  "settings.sections.label": "Разделы настроек",

  "settings.group.software": "Программа",
  "settings.group.runtime": "Среда выполнения",
  "settings.group.workers": "Фоновые службы",
  "settings.group.subscription": "Подписка",
  "settings.group.access": "Аккаунт и доступ",
  "settings.group.appearance": "Внешний вид",
  "settings.group.embeddings": "Семантический поиск",

  "editor.tabs.overflowMenu": "Действия с вкладками",
  "editor.tabs.close": "Закрыть",
  "editor.tabs.closeOthers": "Закрыть другие",
  "editor.tabs.closeAll": "Закрыть все",
  "editor.tabs.closeAllNotes": "Закрыть все заметки",
  "editor.tab.settings": "Настройки",
  "editor.tab.baseSharing": "Общий доступ к базе",
  "editor.tab.externalUpdatePending": "Обновлено извне во время редактирования",
  "editor.externalUpdate.banner":
    "Заметка была изменена извне, пока у вас есть несохранённые правки. Сохраните или отмените изменения, чтобы загрузить актуальную версию.",

  "settings.section.interface.language.title": "Язык интерфейса",
  "settings.section.interface.language.description":
    "Язык, на котором отображается интерфейс",
  "settings.section.interface.language.label": "Язык интерфейса",
  "settings.section.interface.direction.title": "Направление чтения",
  "settings.section.interface.direction.description":
    "Направление чтения текста в приложении",
  "settings.section.interface.direction.label": "Направление чтения",
  "settings.section.noteLanguage.title": "Язык заметок",
  "settings.section.noteLanguage.description":
    "Язык, на котором ИИ-агенты пишут заметки",
  "settings.section.noteLanguage.label": "Язык заметок",
  "settings.section.noteLanguage.hint":
    "Новые заметки от ИИ-агентов будут создаваться на этом языке.",
  "settings.section.noteLanguage.save": "Сохранить",
  "settings.section.noteLanguage.saving": "Сохранение...",
  "settings.section.runtime.title": "Среда выполнения",
  "settings.section.runtime.description":
    "Проверяйте фоновые службы и зависимости через диагностику desktop shell.",
  "settings.runtime.activeEmbedding": "Активные эмбеддинги: {provider} ({model})",
  "settings.runtime.sourceShell":
    "Основной источник: диагностика desktop shell. Состояние bridge показано как дополнительный контекст.",
  "settings.runtime.unavailable":
    "Диагностика среды выполнения доступна только внутри desktop shell.",
  "settings.runtime.loading": "Загрузка диагностики среды выполнения...",
  "settings.runtime.action.refresh": "Обновить",
  "settings.runtime.loadFailed": "Не удалось загрузить диагностику среды выполнения.",
  "settings.runtime.servicesTitle": "Службы ({count})",
  "settings.runtime.dependenciesTitle": "Зависимости ({count})",
  "settings.runtime.noItems": "Диагностические элементы не найдены.",
  "settings.runtime.notice.healthy": "Среда выполнения работает нормально.",
  "settings.runtime.notice.readOnly":
    "Диагностика среды выполнения доступна из desktop shell.",
  "settings.runtime.notice.conflict":
    "Обнаружен конфликт со сторонним процессом. Locram не завершает чужие listener-процессы автоматически.",
  "settings.runtime.notice.notOperable":
    "Среда выполнения работает не полностью. Проверьте проблемные элементы перед использованием фоновых функций.",
  "settings.runtime.notice.unsupported":
    "Диагностика восстановления среды выполнения сейчас поддерживается только на macOS.",
  "settings.runtime.notice.degraded":
    "Среда выполнения деградирована, потому что {label} работает некорректно.",
  "settings.runtime.notice.needsRepair":
    "Среда выполнения требует исправления, потому что {label} отсутствует, устарел или не подтверждён.",
  "settings.runtime.notice.dependencyMissing":
    "Среда выполнения заблокирована, потому что зависимость {label} отсутствует.",
  "settings.runtime.notice.dependencyIncomplete":
    "Среда выполнения ожидает готовности зависимости {label}.",
  "settings.runtime.notice.embeddingPending":
    "Зависимости embeddings еще подготавливаются. Поиск и семантические функции могут быть неполными.",
  "settings.runtime.observedProcesses": "Процессы ({count})",
  "settings.runtime.detail.pid": "PID {pid}",
  "settings.runtime.detail.port": "Порт {port}",
  "settings.runtime.detail.managedService": "Управляемая служба {label}",
  "settings.runtime.processRelation.listener": "Слушатель",
  "settings.runtime.processRelation.parent": "Родитель",
  "settings.runtime.processRelation.process": "Процесс",
  "settings.runtime.processRuntimeHome": "Путь среды выполнения {path}",
  "settings.runtime.confidence.confirmedManaged": "Управляется",
  "settings.runtime.confidence.probablyManaged": "Вероятно",
  "settings.runtime.confidence.unverified": "Не подтверждено",
  "settings.runtime.confidence.staleManaged": "Устарело",
  "settings.runtime.confidence.foreignConflict": "Чужой",
  "settings.runtime.confidence.unknown": "Неясно",
  "settings.runtime.action.restart": "Перезапустить",
  "settings.runtime.action.restarting": "Перезапуск...",
  "settings.runtime.action.repair": "Исправить",
  "settings.runtime.action.repairing": "Исправление...",
  "settings.runtime.action.failed": "Действие среды выполнения завершилось с ошибкой.",
  "settings.runtime.actionHint.degraded":
    "Для деградированной среды выполнения доступен перезапуск.",
  "settings.runtime.actionHint.needsRepair":
    "Следующее ожидаемое действие здесь — Исправить для отсутствующих, устаревших или неподтверждённых управляемых регистраций. Перезапуск пока недоступен.",
  "settings.runtime.actionHint.conflict":
    "Действия среды выполнения недоступны, пока требуемую роль или порт удерживает другой процесс.",
  "settings.runtime.actionHint.conflictRepairable":
    "Перезапуск остаётся недоступным, пока требуемую роль или порт удерживает другой runtime home. Исправить может вернуть управление доказуемым residue-кластером locram, не завершая вслепую посторонние процессы.",
  "settings.runtime.actionHint.dependencyMissing":
    "Действия среды выполнения недоступны, пока требуемые зависимости не установлены и не доступны.",
  "settings.runtime.actionHint.dependencyIncomplete":
    "Действия среды выполнения недоступны, пока зависимости еще подготавливаются.",
  "settings.runtime.actionHint.unsupported":
    "Действия восстановления среды выполнения сейчас поддерживаются только на macOS.",
  "settings.runtime.actionHint.unavailable":
    "Действия среды выполнения станут доступны, когда диагностика покажет поддерживаемое работоспособное состояние.",

  "settings.locale.en": "English",
  "settings.locale.ru": "Русский",
  "settings.locale.ar": "العربية",

  "settings.direction.ltr": "Слева направо",
  "settings.direction.rtl": "Справа налево",
  "settings.direction.auto": "Авто (по языку)",

  "workspace.header.toggleNavigation": "Панель навигации",
  "workspace.header.toggleInspector": "Панель инспектора",
  "workspace.header.back": "Назад",
  "workspace.header.forward": "Вперёд",
  "workspace.header.reload": "Перезагрузить приложение",
  "workspace.header.openSettings": "Открыть настройки",
  "workspace.header.closeSettings": "Закрыть настройки",
  "workspace.header.settings": "Настройки",
  "workspace.header.switchToDarkTheme": "Тёмная тема",
  "workspace.header.switchToLightTheme": "Светлая тема",

  "workspace.search.label": "Поиск по контенту",
  "workspace.search.placeholder": "Поиск заметок…",
  "workspace.search.noResults": "Подходящих заметок нет",
  "workspace.search.matchKind.title": "Заголовок",
  "workspace.search.matchKind.id": "ID заметки",
  "workspace.search.matchKind.content": "Содержимое",
  "workspace.search.matchKind.other": "Совпадение",

  "tree.item.toggle": "Переключить: {label}",
  "tree.header.toggleSection": "Переключить раздел: {title}",
  "tree.folder.emptyDefault": "Нет: {label}",

  "tree.notes.title": "Заметки",
  "tree.notes.empty": "Нет заметок",
  "tree.notes.titlePlaceholder": "Название заметки",
  "tree.notes.addNewNote": "Новая заметка",
  "tree.notes.addInside": "Добавить заметку внутрь",
  "tree.notes.edit": "Изменить заголовок",
  "tree.notes.delete": "Удалить заметку",
  "tree.notes.copyId": "Скопировать ID заметки",
  "tree.notes.copyIdCopied": "ID заметки скопирован",
  "tree.notes.copyIdAriaCopied": "ID заметки скопирован",
  "tree.notes.deleteConfirmLabel": "Удалить «{title}»?",

  "common.collapseAll": "Свернуть всё",
  "common.confirm": "Подтвердить",
  "common.cancel": "Отмена",
  "common.delete": "Удалить",
  "common.loading": "Загрузка…",

  "smartFolders.section.title": "Папки",
  "smartFolders.section.quickAccess": "Быстрый доступ",
  "smartFolders.section.customScope": "Свои выборки",
  "smartFolders.branch.created": "Создано",
  "smartFolders.branch.modified": "Изменено",
  "smartFolders.branch.toggle": "Развернуть {label}",
  "smartFolders.preset.copyId": "Скопировать ID выборки",
  "smartFolders.preset.copyIdCopiedTitle": "Скопировано",
  "smartFolders.preset.copyIdCopiedAria": "ID выборки скопирован",
  "smartFolders.preset.edit": "Изменить выборку",
  "smartFolders.preset.delete": "Удалить выборку",
  "smartFolders.preset.deleteConfirmLabel": "Удалить «{name}»?",
  "smartFolders.export.subgraph": "Экспортировать подграф",
  "smartFolders.export.subgraphTitle": "Экспортировать как артефакт подграфа",
  "smartFolders.customScope.create": "Создать свою выборку",
  "smartFolders.customScope.empty":
    "Нажмите +, чтобы сохранить текущий фильтр как свою выборку.",
  "smartFolders.scope.clearLabel": "Снять выборку {name}",
  "smartFolders.scope.activeLabel": "Активная выборка: {name}",
  "filters.scope.clearLabel": "Снять активную выборку {name}",
  "smartFolders.builtIn.today": "Сегодня",
  "smartFolders.builtIn.week": "Неделя",
  "smartFolders.builtIn.month": "Месяц",
  "smartFolders.builtIn.needReview": "Требует ревью",
  "smartFolders.builtIn.orphaned": "Без связей",
  "smartFolders.builtIn.scopeLabel": "{branch}: {period}",

  "bases.section.local": "Локальные",
  "bases.section.bases": "Базы",
  "bases.section.artifacts": "Артефакты",
  "bases.section.remote": "Сетевые",
  "bases.section.builtIn": "Встроенные",

  "settings.section.edition.title": "Редакция",
  "settings.section.edition.description": "Текущая редакция Locram Desktop.",
  "settings.section.subscription.title": "Подписка",
  "settings.section.subscription.description":
    "Управляет платными возможностями на этом устройстве.",
  "settings.section.subscription.description.pro":
    "На этом устройстве активна подписка Pro",
  "settings.section.subscription.description.trial":
    "На этом устройстве активен пробный доступ",
  "settings.section.subscription.description.free":
    "Подключите Pro, чтобы открыть управляемые функции десктопа и платные возможности на этом устройстве",
  "settings.section.subscription.description.notConnected":
    "Войдите, чтобы просматривать и управлять подпиской на этом устройстве",
  "settings.section.subscription.action.manage": "Управлять подпиской",
  "settings.section.account.title": "Аккаунт",
  "settings.section.account.description.openBilling":
    "Откройте настройки оплаты и аккаунта Locram в браузере",
  "settings.section.account.description.openBillingNeedsUrl":
    "Откройте настройки оплаты и аккаунта Locram в браузере. Сначала задайте VITE_LOCRAM_ACCOUNT_WEB_URL.",
  "settings.section.account.description.reconnect":
    "Войдите ещё раз, чтобы восстановить активацию Locram, уже привязанную к этому устройству.",
  "settings.section.account.description.connect":
    "Войдите, чтобы связать это устройство с аккаунтом Locram.",
  "settings.section.account.description.noSubscription":
    "Аккаунт подключён, но для этого устройства ещё нет активной подписки Pro.",
  "settings.section.account.action.upgradeToPro": "Перейти на Pro",
  "settings.section.account.action.connectPro": "Подключить Pro",
  "settings.section.account.action.open": "Открыть аккаунт",
  "settings.section.account.action.reconnect": "Переподключить",
  "settings.section.account.action.connect": "Войти",
  "settings.section.account.action.connecting": "Вход...",
  "settings.section.account.signInRequiredTitle": "Требуется вход",
  "settings.section.account.signInRequiredDescription":
    "Войдите в аккаунт Locram, прежде чем настраивать управляемые функции десктопа на этом устройстве.",
  "settings.section.account.signOut": "Выйти",
  "settings.section.account.signOutPending": "Выход...",
  "settings.section.account.forgetDevice": "Забыть устройство",
  "settings.section.account.forgetDevicePending": "Удаление...",

  "nodeCard.openNode": "Открыть узел графа",
  "nodeCard.collapseMetadata": "Свернуть метаданные заметки",
  "nodeCard.expandMetadata": "Развернуть метаданные заметки",
  "nodeCard.collapseGroup": "Свернуть группу",
  "nodeCard.expandGroup": "Развернуть группу",
  "nodeCard.itemsCount": "{count} элем.",
  "nodeCard.itemsCountOne": "{count} элем.",
  "nodeCard.metadata.updated": "Обновлено",
  "nodeCard.metadata.created": "Создано",
  "nodeCard.metadata.reviewed": "Ревизировано",
  "nodeCard.metadata.reviewIn": "Ревизия через",
  "nodeCard.reviewInterval.days": "{count} дн.",
  "nodeCard.title.untitled": "Без названия",
  "common.none": "Нет",

  "nodeCard.status.active": "активна",
  "nodeCard.status.archived": "в архиве",
  "nodeCard.status.toDelete": "к удалению",

  "nodeCard.type.fleeting": "временная",
  "nodeCard.type.noteTaking": "конспект",
  "nodeCard.type.permanent": "постоянная",
  "nodeCard.type.structure": "структура",
  "nodeCard.type.hub": "хаб",
  "nodeCard.type.tag": "тег",
  "nodeCard.type.node": "Узел",

  "parentGroupCard.other": "Прочее",
  "parentGroupCard.selectedCount": "Выбрано: {count}",

  "network.section.sharesIManage": "Расшаренное мной",
  "network.tooltips.openBaseSharingManagement": "Открыть управление общим доступом к базе",
  "network.tooltips.openBaseSharingManagementBlocked":
    "Общий доступ требует активной подписки Pro",
  "network.tooltips.refreshSharesIManage": "Обновить расшаренное мной",
  "network.tooltips.openBaseSharing": "Открыть общий доступ к базе",
  "network.tooltips.inspect": "Просмотреть",
  "network.tooltips.copyGrantId": "Скопировать ID гранта",
  "network.tooltips.revokeBaseGrant": "Отозвать грант доступа",
  "network.tooltips.deleteBaseGrant": "Удалить грант доступа",

  "bases.tooltips.shareThisBase": "Поделиться этой базой",
  "bases.tooltips.mergeIntoActiveBase": "Объединить с активной базой",
  "bases.tooltips.rename": "Переименовать",
  "bases.tooltips.renameForRecipient": "Переименовать для этого получателя",
  "bases.tooltips.backupNow": "Сделать резервную копию",
  "bases.tooltips.inspect": "Просмотреть",
  "bases.tooltips.copyBaseId": "Скопировать base_id",
  "bases.tooltips.copyGrantId": "Скопировать ID гранта",
  "bases.tooltips.copyPath": "Скопировать путь",
  "bases.tooltips.unregister": "Отвязать",
  "bases.tooltips.deleteBase": "Удалить базу",
  "bases.tooltips.removeFromSharedWithMe": "Убрать из расшаренного со мной",
  "bases.tooltips.createNewBase": "Создать новую базу",
  "bases.tooltips.openDatabaseFile": "Открыть файл базы",
  "bases.openDatabase.title": "Открыть файл базы",
  "bases.openDatabase.description.multiBase":
    "Выберите совместимый с Locram файл базы, просмотрите его, затем зарегистрируйте, объедините или восстановите из домашнего экрана файла",
  "bases.openDatabase.description.singleBase":
    "Выберите совместимый с Locram файл базы, просмотрите его, затем при необходимости замените текущую базу из домашнего экрана файла",
  "bases.openDatabase.pathLabel": "Путь к файлу базы",
  "bases.openDatabase.pathPlaceholder": "~/.locram/my-base.db или абсолютный путь",
  "bases.openDatabase.fileSectionLabel": "Файл",
  "bases.openDatabase.dropHint.desktop":
    "Пока открыто это окно, перетащите файл .db в любое место окна Locram или нажмите Выбрать файл",
  "bases.openDatabase.dropHint.browser":
    "В браузере путь из перетаскивания недоступен. Используйте приложение Locram или вставьте абсолютный путь выше",
  "bases.openDatabase.chooseFile": "Выбрать файл",
  "bases.openDatabase.chooseFileDisabled":
    "Выбор файла доступен в приложении Locram",
  "bases.openDatabase.footerHint.multiBase":
    "Locram проверит происхождение и совместимость в домашнем экране файла перед регистрацией, объединением или восстановлением",
  "bases.openDatabase.footerHint.singleBase":
    "Locram проверит происхождение и совместимость в домашнем экране файла. В Free замена текущей базы возможна только при явном выборе этого действия",
  "bases.openDatabase.error.wrongExtension":
    "Перетащите файл базы с расширением .db, .sqlite или .sqlite3",
  "bases.openDatabase.error.browserDropPathHidden":
    "Браузер не может прочитать полный путь из перетаскивания. Введите абсолютный путь вручную",
  "bases.openDatabase.error.nativeDropUnavailable":
    "Перетаскивание файлов недоступно в этой сборке. Используйте Выбрать файл или введите путь",
  "bases.openDatabase.error.openFailed": "Не удалось открыть файл базы",
  "bases.openDatabase.dialogPickerTitle": "Выбрать файл базы",
  "bases.openDatabase.dialogPickerFilter": "База Locram",
  "bases.openDatabase.action.cancel": "Отмена",
  "bases.openDatabase.action.open": "Открыть файл",
  "bases.openDatabase.action.opening": "Открытие…",
  "bases.tooltips.refreshLocalSources": "Обновить локальные источники",
  "bases.tooltips.addSharedBase": "Добавить общую базу",
  "bases.tooltips.refreshRemoteSources": "Обновить удалённые источники",
  "bases.tooltips.cannotMergeBaseIntoItself": "Нельзя объединить базу саму с собой",
  "bases.tooltips.hideFromAgent": "Скрыть от агента",
  "bases.tooltips.showToAgent": "Показать агенту",
  "bases.tooltips.agentAccessWrite": "Агент: полный доступ",
  "bases.tooltips.agentAccessRead": "Агент: только чтение",
  "bases.tooltips.agentAccessHidden": "Агент: скрыта",
  "bases.tooltips.switchBeforeUnregister":
    "Переключитесь на другую базу перед отвязкой",
  "bases.tooltips.switchBeforeDelete": "Переключитесь на другую базу перед удалением",
  "bases.tooltips.sharedBaseUnavailableForInspection":
    "Общая база недоступна для просмотра",
  "bases.tooltips.hideDuplicateEntries": "Скрыть дубликаты записей",
  "bases.tooltips.revealDuplicateEntries": "Показать дубликаты записей",
  "bases.tooltips.copyValue": "Скопировать {label}",
  "bases.tooltips.adminAccessRequiredToShare":
    "Требуется доступ администратора, чтобы поделиться этой базой",
  "bases.tooltips.resharingRequiresAuthority":
    "Повторная отправка полученной общей базы требует учётных данных подписи владельца и в этом интерфейсе недоступна",
  "bases.tooltips.adminAccessRequiredToMerge":
    "Требуется доступ администратора, чтобы объединить эту общую базу",
  "bases.tooltips.activeBaseRequiredForMerge":
    "Для объединения требуется активная локальная база",
  "bases.tooltips.sharedBaseUnavailableForMerge":
    "Общая база недоступна для объединения",
  "bases.tooltips.adminAccessRequiredToBackup":
    "Требуется доступ администратора для резервной копии этой общей базы",
  "bases.tooltips.sharedBaseUnavailableForBackup":
    "Общая база недоступна для резервной копии",
  "network.tooltips.basePathUnavailableForInspection":
    "Путь к базе недоступен для просмотра",

  "common.clear": "Очистить",
  "common.today": "Сегодня",
  "common.untitled": "Без названия",
  "common.unavailable": "Недоступно",

  "editor.fontSize.decrease": "Уменьшить шрифт",
  "editor.fontSize.increase": "Увеличить шрифт",
  "editor.copyContent": "Скопировать содержимое",
  "editor.copyContent.copied": "Скопировано",
  "editor.copyContent.copiedAria": "Содержимое скопировано",
  "editor.noFileSelected": "Файл не выбран.",
  "editor.loadingEditor": "Загрузка редактора…",
  "editor.loadingNote.description": "загрузка заметки из базы…",
  "editor.loadingNote.message": "Загрузка заметки",
  "editor.region.label": "Редактор заметки",

  "graph.modal.expandedGraphScope": "Расширенный охват графа",
  "graph.modal.hideSourcesPanel": "Скрыть панель источников",
  "graph.modal.showSourcesPanel": "Показать панель источников",
  "graph.modal.closeModal": "Закрыть окно",
  "graph.modal.refreshing.description":
    "Обновление текущего охвата графа...",
  "graph.modal.refreshing.message": "Обновление графа",

  "smartFolder.modal.titleEdit": "Изменить смарт-папку",
  "smartFolder.modal.titleCreate": "Создать смарт-папку",
  "smartFolder.modal.descriptionEdit":
    "Обновите сохранённый охват фильтра и синхронизируйте панель быстрых фильтров.",
  "smartFolder.modal.descriptionCreate":
    "Назовите сохранённое представление и задайте охват фильтра в одном месте.",
  "smartFolder.modal.sectionName": "Название",
  "smartFolder.modal.namePlaceholder": "Название смарт-папки",
  "smartFolder.modal.couldNotSave": "Не удалось сохранить смарт-папку.",
  "smartFolder.modal.exportTitle": "Экспорт как артефакт-подграф",
  "smartFolder.modal.exportComplete": "Экспорт завершён — {count} стр.",
  "smartFolder.modal.loadingPages": "Загрузка страниц…",
  "smartFolder.modal.filterMatchCount":
    "{matched} из {total} страниц соответствуют текущему фильтру.",
  "smartFolder.modal.adjustFilter":
    " Скорректируйте фильтр выше, чтобы включить страницы.",
  "smartFolder.modal.packageLabelPlaceholder": "Метка пакета (опционально)",
  "smartFolder.modal.exporting": "Экспорт…",
  "smartFolder.modal.exportButton": "Экспортировать {count} стр.",
  "smartFolder.modal.createSubgraphExport": "Создать экспорт подграфа",
  "smartFolder.modal.saving": "Сохранение…",
  "smartFolder.modal.save": "Сохранить",
  "smartFolder.modal.createSmartFolderAction": "Создать смарт-папку",
  "smartFolder.modal.exportFailed": "Сбой экспорта",

  "filters.title.type": "Тип",
  "filters.title.status": "Статус",
  "filters.title.relations": "Связи",
  "filters.title.created": "Создано",
  "filters.title.updated": "Обновлено",
  "filters.title.reviewed": "Просмотрено",
  "filters.clearSelection": "Снять выбор",
  "filters.selectAll": "Выбрать всё",
  "filters.clearGroupAria": "Очистить «{title}»",
  "filters.selectAllGroupAria": "Выбрать всё в «{title}»",
  "filters.clearDateRange": "Очистить диапазон дат",
  "filters.clearDateRangeAria": "Очистить диапазон «{title}»",
  "filters.selectStartDate": "Выберите дату начала",
  "filters.selectEndDate": "Выберите дату окончания",
  "filters.saveAsSmartFolder": "Сохранить как смарт-папку…",

  "filters.metadata.heading": "Правила метаданных",
  "filters.metadata.descriptionPrefix": "Сгруппируйте правила через",
  "filters.metadata.descriptionMiddle": "или",
  "filters.metadata.descriptionSuffix":
    ". Используйте для логики по заголовку, теме и тегам.",
  "filters.metadata.and": "И",
  "filters.metadata.or": "ИЛИ",
  "filters.metadata.not": "НЕ",
  "filters.metadata.addGroup": "Добавить группу",
  "filters.metadata.removeGroup": "Удалить группу",
  "filters.metadata.addRule": "Добавить правило",
  "filters.metadata.removeRule": "Удалить",
  "filters.metadata.group": "Группа {index}",
  "filters.metadata.rule": "Правило {index}",
  "filters.metadata.groupJoinerLabel": "Связка группы",
  "filters.metadata.field": "Поле",
  "filters.metadata.operator": "Оператор",
  "filters.metadata.titleField": "Заголовок",
  "filters.metadata.subjectField": "Тема",
  "filters.metadata.tagField": "Тег",
  "filters.metadata.titlePlaceholder": "Введите текст заголовка...",
  "filters.metadata.searchSubject": "Поиск по теме...",
  "filters.metadata.searchTag": "Поиск по тегам...",
  "filters.metadata.emptySubject": "Значения темы не выбраны.",
  "filters.metadata.emptyTag": "Значения тегов не выбраны.",
  "filters.metadata.op.contains": "содержит",
  "filters.metadata.op.doesNotContain": "не содержит",
  "filters.metadata.op.hasAnyOf": "содержит хотя бы одно из",
  "filters.metadata.op.hasAllOf": "содержит все из",
  "filters.metadata.op.hasNoneOf": "не содержит ни одного из",

  "filters.multiSelect.all": "Все",
  "filters.multiSelect.clear": "Очистить",
  "filters.multiSelect.added": "Добавлено",
  "filters.multiSelect.add": "Добавить",
  "filters.multiSelect.noMatches": "Ничего не найдено.",
  "filters.multiSelect.searchAria": "Поиск: {field}",
  "filters.multiSelect.clearSearchAria": "Очистить поиск: {field}",

  "linkType.parent": "родитель",
  "linkType.tag": "тег",
  "linkType.related": "связано",
  "linkType.extends": "расширяет",
  "linkType.extended_by": "расширена через",
  "linkType.supports": "поддерживает",
  "linkType.supported_by": "поддержано через",
  "linkType.contradicts": "противоречит",
  "linkType.contradicted_by": "опровергнуто через",
  "linkType.refines": "уточняет",
  "linkType.refined_by": "уточнено через",
  "linkType.questions": "ставит под вопрос",
  "linkType.questioned_by": "опрошено через",
  "linkType.reference": "ссылка",

  "pageStatus.active": "активна",
  "pageStatus.archived": "в архиве",
  "pageStatus.to_delete": "к удалению",

  "pageType.fleeting": "временная",
  "pageType.noteTaking": "конспект",
  "pageType.permanent": "постоянная",
  "pageType.structure": "структура",
  "pageType.hub": "хаб",

  "fileHome.section.details": "Подробности",
  "fileHome.section.statistics": "Статистика",
  "fileHome.showAdvanced": "Показать расширенные",
  "fileHome.hideAdvanced": "Скрыть расширенные",
  "fileHome.classLabel.localBase": "Локальная база",
  "fileHome.classLabel.builtInBase": "Встроенная",
  "fileHome.classLabel.snapshot": "Снимок",
  "fileHome.classLabel.scopedExport": "Точечный экспорт",
  "fileHome.compatibility.ready": "Готова",
  "fileHome.compatibility.corrupted": "Повреждена",
  "fileHome.compatibility.unsupportedSchema": "Несовместимая схема",
  "fileHome.compatibility.migrationRequired": "Требуется миграция",

  "fileHome.layout.badge.localBase": "Локальная база",
  "fileHome.layout.badge.sharedBase": "Общая база",
  "fileHome.layout.badge.builtIn": "Встроенная",
  "fileHome.layout.subtitle.localBaseActive": "Сводка и действия для активной базы.",
  "fileHome.layout.subtitle.localBaseInspect": "Просмотр без переключения активной базы.",
  "fileHome.layout.subtitle.managedBaseActive": "Сводка и действия для встроенной базы.",
  "fileHome.layout.subtitle.managedBaseInspect": "Просмотр без переключения активной базы.",
  "fileHome.layout.subtitle.sharedBase": "Сведения об общей базе и действия получателя.",
  "fileHome.layout.subtitle.sharedBaseActive":
    "Эта общая база активна как текущая рабочая. Заметки, граф и поиск ограничены удалённой базой; владение и доступ остаются нелокальными.",
  "fileHome.layout.subtitle.sharedBaseInspect": "Просмотр общей базы без переключения на неё как рабочую.",
  "fileHome.sharedBase.statsRemoteUnavailable":
    "Статистика недоступна: у этой общей базы нет локального зеркала, а устройство владельца сейчас недоступно через broker. Запустите access connect на стороне владельца или создайте локальное зеркало (backup) с правами admin.",
  "fileHome.action.active": "Активна",
  "fileHome.action.activate": "Активировать",
  "fileHome.confirm.registerAsNewDb": "Зарегистрировать {name} как новую БД?",
  "fileHome.confirm.registerAction": "Подтвердить регистрацию как новой БД",
  "fileHome.confirm.registerPending": "Регистрация…",
  "fileHome.confirm.deleteArtifact": "Удалить {name}?",
  "fileHome.confirm.deleteAction": "Подтвердить удаление",
  "fileHome.confirm.deletePending": "Удаление…",
  "fileHome.confirm.mergePlan":
    "Объединить {pages} заметок и {edges} новых рёбер в {target}?",
  "fileHome.confirm.mergeAction": "Подтвердить объединение в активную БД",
  "fileHome.confirm.mergePending": "Объединение…",
  "fileHome.confirm.renameArtifactPlaceholder": "Имя файла артефакта",
  "fileHome.confirm.renameAction": "Подтвердить переименование",
  "fileHome.confirm.renamePending": "Переименование…",
  "fileHome.confirm.unregisterAction": "Отвязать",
  "fileHome.confirm.unregisterPrompt":
    "Отвязать {name}? Файл останется на диске.",
  "fileHome.confirm.deleteBaseAction": "Удалить базу",
  "fileHome.confirm.deleteBasePrompt": "Удалить {name} вместе с её файлом?",

  "dock.sources": "Источники",
  "dock.network": "Сеть",
  "dock.notes": "Заметки",

  "sources.toolbar.search.label": "Поиск по источникам",
  "sources.toolbar.search.placeholder": "Поиск…",
  "sources.toolbar.search.clear": "Очистить поиск по источникам",
  "sources.toolbar.edit.exit": "Выйти из режима редактирования",
  "sources.toolbar.edit.enter": "Редактировать узлы",
  "sources.toolbar.graph.show": "Показать граф",
  "sources.toolbar.graph.hide": "Скрыть граф",
  "sources.toolbar.filters.toggle": "Фильтры",
  "sources.toolbar.filters.reset": "Сбросить все фильтры",
  "sources.toolbar.filters.returnToPreset": "Вернуться к выборке «{name}»",

  "fileHome.detail.path": "Путь",
  "fileHome.detail.kind": "Тип",
  "fileHome.detail.compatibility": "Совместимость",
  "fileHome.detail.registered": "Зарегистрирована",
  "fileHome.detail.lastOpened": "Открыта последний раз",
  "fileHome.detail.provenance": "Происхождение",
  "fileHome.detail.provenanceManagedRemote": "Удалённый управляемый артефакт",
  "fileHome.detail.provenanceManagedPackaged": "Встроенный снимок из поставки",
  "fileHome.detail.managedVersion": "Версия",
  "fileHome.detail.managedUpdated": "Обновлено",
  "fileHome.detail.copyPathError": "Не удалось скопировать путь монтирования.",
  "fileHome.detail.baseId": "ID базы",
  "fileHome.detail.artifactId": "ID артефакта",
  "fileHome.detail.sourceBaseId": "ID исходной базы",
  "fileHome.detail.packageLabel": "Метка пакета",
  "fileHome.detail.attachmentCoverage": "Покрытие вложений",
  "fileHome.detail.created": "Создана",
  "fileHome.detail.activated": "Активирована",
  "fileHome.detail.schemaVersion": "Версия схемы",
  "fileHome.detail.artifactSchemaFamily": "Семейство схемы артефакта",
  "fileHome.detail.artifactSchemaVersion": "Версия схемы артефакта",
  "fileHome.detail.errors": "Ошибки",
  "fileHome.detail.shareBaseId": "ID общей базы",
  "fileHome.detail.grantId": "ID доступа",
  "fileHome.detail.entryId": "ID записи",
  "fileHome.detail.expires": "Срок действия",
  "fileHome.detail.openEnded": "Без срока",
  "fileHome.detail.ownerActor": "Владелец (актор)",
  "fileHome.detail.authorityPath": "Путь авторитета",
  "fileHome.detail.owner": "Владелец",
  "fileHome.detail.recipient": "Получатель",
  "fileHome.detail.access": "Доступ",
  "fileHome.detail.visibility": "Видимость",
  "fileHome.detail.visibleToAgent": "Виден агенту",
  "fileHome.detail.authority": "Источник доступа",
  "fileHome.detail.remoteBrokerAccess": "Доступ через broker",
  "fileHome.detail.localMirrorAvailable": "Локальная копия доступна",
  "fileHome.detail.hiddenFromAgent": "Скрыт от агента",
  "fileHome.detail.copyPath": "Скопировать путь",
  "fileHome.detail.pathCopied": "Путь скопирован",
  "fileHome.detail.loadingRegistry": "Загрузка метаданных реестра…",
  "fileHome.detail.loadingShort": "Загрузка…",

  "fileHome.metric.notes": "Заметки",
  "fileHome.metric.edges": "Связи",
  "fileHome.metric.size": "Размер",
  "fileHome.metric.unembedded": "Без эмбеддингов",
  "fileHome.metric.orphaned": "Без связей",
  "fileHome.metric.dueReview": "Пора ревью",
  "fileHome.embedAction.fix": "Исправить",
  "fileHome.embedAction.running": "Запуск",
  "fileHome.embedAction.tooltip": "Получить недостающие эмбеддинги",
  "fileHome.embedAction.success": "Обновление эмбеддингов для «{label}» завершено.",
  "fileHome.embedAction.failed": "Не удалось обновить эмбеддинги.",

  "fileHome.metricDetail.notesActiveTotal": "{active} активных / {total} всего",
  "fileHome.metricDetail.notesLoading":
    "Загрузка статистики заметок из метаданных реестра",
  "fileHome.metricDetail.notesUnavailable": "Статистика заметок недоступна",
  "fileHome.metricDetail.edgesInBase": "Типизированные связи в этой базе",
  "fileHome.metricDetail.edgesInSharedBase":
    "Типизированные связи в общей базе",
  "fileHome.metricDetail.edgesInFile": "Сохранённые связи в этом файле",
  "fileHome.metricDetail.notesInFile": "Сохранённые заметки в этом файле",
  "fileHome.metricDetail.notesInSharedBase":
    "Данные, сообщённые принятой общей базой.",
  "fileHome.metricDetail.sqliteSize": "Размер файла SQLite",
  "fileHome.metricDetail.sharedBaseSize":
    "Размер SQLite общей базы, если доступен",
  "fileHome.metricDetail.unembedded": "Заметки без эмбеддингов",
  "fileHome.metricDetail.orphaned": "Заметки без родителя и связей",
  "fileHome.metricDetail.dueReview": "Заметки, которым пора пройти ревью",

  "fileHome.management.title": "Управление",
  "fileHome.management.descriptionBase":
    "Используйте эту страницу для действий уровня базы. За навигацию по заметкам и контекст узлов отвечают Заметки и Граф.",
  "fileHome.management.descriptionInspect":
    "Поверхность остаётся в режиме просмотра. Действия, требующие активной базы, переключат её первой.",
  "fileHome.management.descriptionArtifact":
    "Используйте эту страницу для действий уровня артефакта.",
  "fileHome.management.descriptionManagedRemote":
    "«Обновить сведения» перечитывает метрики и дерево заметок с текущего mount. «Загрузить обновление» заменяет смонтированный артефакт SQLite из настроенного удалённого канала релизов и повторно запускает семантический прогрев. Слияние, удаление, отвязка и переименование намеренно недоступны для встроенных баз.",
  "fileHome.management.descriptionManagedLocal":
    "Эта встроенная база смонтирована только для чтения из локальной установки. «Обновить сведения» перечитывает метрики и дерево заметок с текущего mount. Удалённый источник обновлений пока не настроен, поэтому «Загрузить обновление» недоступно.",
  "fileHome.management.localeLabel": "Локаль",
  "fileHome.management.actionManagedSummaryRefresh": "Обновить сведения",
  "fileHome.management.actionManagedSummaryRefreshPending": "Обновление сведений…",
  "fileHome.management.actionManagedUpdate": "Загрузить обновление",
  "fileHome.management.actionManagedUpdatePending": "Загрузка обновления…",
  "fileHome.management.managedUpdateChannelNoteRemote":
    "Текущий смонтированный снимок можно заменить из настроенного канала публикации.",
  "fileHome.management.managedUpdateChannelNoteLocal":
    "Сейчас эта встроенная база использует локальный снимок из поставки, так как удалённый источник обновлений не настроен.",
  "fileHome.management.managedRefreshSuccess":
    "{label} обновлена до последнего смонтированного снимка, семантический прогрев завершён.",
  "fileHome.management.managedRefreshError": "Не удалось обновить встроенную базу.",
  "fileHome.management.managedSummaryReloadSuccess":
    "Сведения и дерево заметок для {label} перечитаны.",
  "fileHome.management.managedSummaryReloadError":
    "Не удалось перечитать сведения о встроенной базе.",
  "fileHome.management.managedActivateError": "Не удалось активировать эту встроенную базу.",
  "fileHome.management.basesRegistryLoadError":
    "Не удалось загрузить метаданные реестра активных баз.",
  "fileHome.management.action.mergeBase": "Слить базу",
  "fileHome.management.action.shareBase": "Поделиться базой",
  "fileHome.management.action.backupNow": "Резервная копия",
  "fileHome.management.action.hideFromAgent": "Скрыть от агента",
  "fileHome.management.action.showToAgent": "Показать агенту",
  "fileHome.management.action.copyBaseId": "Скопировать base_id",
  "fileHome.management.action.copyBaseIdCopied": "base_id скопирован",
  "fileHome.management.action.rename": "Переименовать",
  "fileHome.management.action.cancelRename": "Отменить переименование",
  "fileHome.management.action.unregister": "Отвязать",
  "fileHome.management.action.cancelUnregister": "Отменить отвязку",
  "fileHome.management.action.deleteBase": "Удалить базу",
  "fileHome.management.action.cancelDelete": "Отменить удаление",
  "fileHome.management.action.registerNewDb": "Зарегистрировать как новую БД",
  "fileHome.management.action.replaceActiveDb": "Заменить активную БД",
  "fileHome.management.action.mergeIntoActiveDb": "Слить с активной БД",
  "fileHome.management.action.copyArtifactId": "Скопировать artifact_id",
  "fileHome.management.action.delete": "Удалить",
  "fileHome.management.action.removeSharedBase": "Удалить общую базу",
  "fileHome.management.action.cancelRemoveSharedBase": "Отменить удаление",
  "fileHome.management.placeholderBaseName": "Отображаемое имя базы",
  "fileHome.management.placeholderSharedBaseName": "Имя общей базы",
  "fileHome.management.confirmBackup": "Подтвердить резервную копию",
  "fileHome.management.confirmHideFromAgent": "Подтвердить скрытие от агента",
  "fileHome.management.confirmShowToAgent":
    "Подтвердить показ агенту",
  "fileHome.management.confirmShareBase": "Подтвердить общий доступ",
  "fileHome.management.confirmOpenMergeFlow": "Открыть мастер слияния",
  "fileHome.management.confirmGeneric": "Подтвердить",
  "fileHome.management.removeSharedBasePrompt":
    "Удалить {name} из «Доступно мне»?",
  "fileHome.management.pendingMerge":
    "Открыть мастер слияния для {name}?",
  "fileHome.management.pendingShare": "Открыть общий доступ для {name}?",
  "fileHome.management.pendingBackup":
    "Создать резервную копию для {name} вручную?",
  "fileHome.management.pendingHide": "Скрыть {name} от инструментов агента?",
  "fileHome.management.pendingShow":
    "Показать {name} инструментам агента?",
  "fileHome.management.pendingMergeDetail":
    "Это открывает поверхность слияния для базы. Активная база не изменится, пока вы не подтвердите слияние там.",
  "fileHome.management.pendingShareDetail":
    "Общий доступ может сначала переключить активную базу, чтобы поверхность открылась против правильной рабочей базы.",
  "fileHome.management.pendingBackupDetail":
    "Будет немедленно создана новая резервная копия этой базы.",
  "fileHome.management.pendingBackupDetailShared":
    "Резервная копия будет создана из авторитетной копии этой общей базы.",
  "fileHome.management.pendingHideDetail":
    "База перестанет появляться в видимых агенту списках локальных баз.",
  "fileHome.management.pendingShowDetail":
    "База снова появится в видимых агенту списках локальных баз.",
  "fileHome.management.pendingHideDetailShared":
    "Эта общая база перестанет появляться в видимых агенту списках общих баз.",
  "fileHome.management.pendingShowDetailShared":
    "Эта общая база снова станет доступна в видимых агенту списках общих баз.",
  "fileHome.management.pendingAgentAccessToRead":
    "Перевести {name} в режим «только чтение» для агента?",
  "fileHome.management.pendingAgentAccessToHidden":
    "Скрыть {name} от инструментов агента?",
  "fileHome.management.pendingAgentAccessToWrite":
    "Разрешить агенту полный доступ к {name}?",
  "fileHome.management.pendingAgentAccessToReadDetail":
    "Агент может читать и переключаться на базу, но не может писать в её SQLite.",
  "fileHome.management.pendingAgentAccessToHiddenDetail":
    "База перестанет появляться в видимых агенту списках локальных баз.",
  "fileHome.management.pendingAgentAccessToWriteDetail":
    "Агент может читать и изменять эту базу через MCP.",
  "fileHome.management.confirmAgentAccessToRead": "Подтвердить только чтение",
  "fileHome.management.confirmAgentAccessToHidden": "Подтвердить скрытие",
  "fileHome.management.confirmAgentAccessToWrite": "Подтвердить полный доступ",
  "fileHome.management.noticeAgentAccessUpdated":
    "Доступ агента к {name}: {mode}.",
  "fileHome.management.noticeSharedBaseRenamed":
    "Общая база переименована в «{name}».",
  "fileHome.management.noticeSharedBaseBackupCreated":
    "Создана ручная резервная копия {filename}.",
  "fileHome.management.noticeSharedBaseVisibleToAgent":
    "{name} снова видна инструментам агента.",
  "fileHome.management.noticeSharedBaseHiddenFromAgent":
    "{name} теперь скрыта от инструментов агента.",

  "bases.projectionState.active": "Активна",
  "bases.projectionState.ready": "Готова",
  "bases.projectionState.public": "Публичная",
  "bases.projectionState.degraded": "Деградирована",
  "bases.projectionState.offline": "Офлайн",
  "bases.projectionState.local": "Локальная",

  "graph.canvas.changeGraphView": "Сменить вид графа",
  "graph.canvas.graphViewLabel": "Вид графа: {view}",
  "graph.canvas.graphViewMermaid": "Mermaid",
  "graph.canvas.freeze": "Заморозить граф для исследования",
  "graph.canvas.unfreeze":
    "Разморозить граф и синхронизировать с выбранной заметкой",
  "graph.canvas.freezeExpanded":
    "Заморозить развёрнутый граф для исследования",
  "graph.canvas.unfreezeExpanded":
    "Разморозить развёрнутый граф и синхронизировать с выбранной заметкой",
  "graph.canvas.refreshScope": "Обновить текущую область графа",
  "graph.canvas.rebuildFromSelection":
    "Перестроить граф от выбранной заметки",
  "graph.canvas.stale": "Граф устарел",
  "graph.sharedBase.partialPageGraphLoad":
    "Семантические связи загружены для {loaded} из {requested} страниц. Часть связей может отсутствовать.",
  "graph.canvas.hideNodeLabels": "Скрыть подписи узлов",
  "graph.canvas.showNodeLabels": "Показать подписи узлов",
  "graph.canvas.hideTagNodes": "Скрыть теги",
  "graph.canvas.showTagNodes": "Показать теги",
  "graph.canvas.disableCameraOrbit": "Отключить орбиту камеры",
  "graph.canvas.enableCameraOrbit": "Включить орбиту камеры",
  "graph.canvas.expandFullScreen": "Развернуть граф на весь экран",
  "graph.canvas.zoomToFitAll": "Уместить все узлы",
  "graph.canvas.savingMermaidAttachment": "Сохранение вложения Mermaid SVG",
  "graph.canvas.saveMermaidAttachment": "Сохранить вложение Mermaid SVG",
  "graph.canvas.depthAriaLabel": "Глубина графа",
  "graph.canvas.depthTitle": "Глубина графа: {depth}",
  "graph.canvas.loadingGraphView": "Загрузка вида графа…",
  "graph.canvas.savedMermaidAttachment": "Сохранённое вложение Mermaid: ",
  "graph.canvas.couldNotRenderMermaid":
    "Не удалось отрендерить вложение Mermaid.",
  "graph.canvas.couldNotCaptureMermaidSvg":
    "Не удалось сохранить видимый Mermaid SVG.",

  "bases.detail.notes": "заметки",
  "bases.detail.nodes": "узлы",
  "bases.detail.edges": "связи",
  "bases.detail.size": "размер",
  "bases.detail.type": "тип",
  "bases.detail.owner": "владелец",
  "bases.detail.baseId": "id базы",
  "bases.detail.entryId": "id записи",
  "bases.detail.grantId": "id гранта",
  "bases.detail.artifactId": "id артефакта",
  "bases.detail.sourceBaseId": "id исходной базы",
  "bases.detail.registered": "зарегистрирована",
  "bases.detail.created": "создана",
  "bases.detail.activated": "активирована",
  "bases.detail.expires": "истекает",
  "bases.detail.activeOnly": "активных: {active}",
  "bases.detail.activeOfTotal": "активных: {active} / всего: {total}",
  "bases.kindLabel.scopedExport": "ограниченный экспорт",
  "bases.kindLabel.backup": "резервная копия",
  "bases.action.deleteBackup": "Удалить резервную копию",
  "bases.action.deleteExport": "Удалить экспорт",
  "bases.confirm.deleteArtifact": "Удалить «{label}»?",

  "settings.section.software.title": "Установленная версия",
  "settings.section.software.description":
    "Держите программу обновлённой для лучшей производительности",
  "settings.section.software.checkForUpdates": "Проверить обновления",
  "settings.section.software.upToDate": "Актуальная",
  "settings.section.software.sourceGitSha": "Коммит исходников",
  "settings.section.software.runtimeBuildId": "Сборка runtime",
  "settings.section.software.check": "Проверить",
  "settings.section.software.update": "Обновить",
  "settings.section.software.installing": "Установка...",
  "settings.section.software.checking": "Проверка...",
  "settings.section.software.installedMessage":
    "Обновление установлено. Перезапуск приложения...",
  "settings.embeddingBootstrap.pending.hosted":
    "Подготавливаются Locram hosted embeddings. Locram можно использовать; семантический поиск может быть ограничен до завершения настройки.",
  "settings.embeddingBootstrap.pending.huggingface":
    "Ожидается настройка Hugging Face embeddings. Locram можно использовать; семантический поиск может быть ограничен до завершения настройки.",
  "settings.embeddingBootstrap.pending.ollama":
    "Подготавливается локальный runtime для embeddings (Ollama). Locram можно использовать; семантический поиск может быть ограничен до завершения настройки.",
  "settings.embeddingBootstrap.running.hosted":
    "Получаются учётные данные Locram hosted embeddings. Locram остаётся доступен — настройка идёт в фоне.",
  "settings.embeddingBootstrap.running.huggingface":
    "Проверяется конфигурация Hugging Face embeddings. Locram остаётся доступен — настройка идёт в фоне.",
  "settings.embeddingBootstrap.running.ollama":
    "Скачивается модель embeddings. Это может занять несколько минут. Locram остаётся доступен — настройка идёт в фоне.",
  "settings.embeddingBootstrap.failed.hosted":
    "Не удалось настроить Locram hosted embeddings: {error}. Семантический поиск и auto-embed могут быть недоступны, пока вы не перезапустите Locram.",
  "settings.embeddingBootstrap.failed.huggingface":
    "Не удалось настроить Hugging Face embeddings: {error}. Укажите LOCRAM_EMBED_API_KEY и перезапустите Locram или смените провайдера через env.",
  "settings.embeddingBootstrap.failed.ollama":
    "Не удалось настроить embeddings: {error}. Семантический поиск и auto-embed могут быть недоступны, пока вы не перезапустите Locram или не установите Ollama вручную.",

  "settings.section.embedding.title": "Провайдер embeddings",
  "settings.section.embedding.description": "Для семантического поиска.",
  "settings.embedding.loading": "Загрузка настроек embeddings...",
  "settings.embedding.loadFailed": "Не удалось загрузить настройки embeddings.",
  "settings.embedding.provider.locramHosted": "Locram hosted",
  "settings.embedding.provider.huggingFace": "Hugging Face",
  "settings.embedding.provider.ollama": "Локальный Ollama",
  "settings.embedding.huggingFaceToken.label": "Токен Hugging Face API",
  "settings.embedding.huggingFaceToken.description":
    "Хранится локально и используется для запросов embeddings к Hugging Face.",
  "settings.embedding.huggingFaceToken.placeholder": "hf_...",
  "settings.embedding.ollamaModel.label": "Модель Ollama",
  "settings.embedding.ollamaModel.description":
    "Имя модели, которую Locram запрашивает у локального runtime Ollama.",
  "settings.embedding.ollamaUrl.label": "URL Ollama",
  "settings.embedding.ollamaUrl.description":
    "Базовый URL локального сервера Ollama, к которому обращается Locram.",
  "settings.embedding.action.save": "Сохранить",
  "settings.embedding.action.saving": "Сохранение...",
  "settings.embedding.restartNotice":
    "Перезапустите desktop runtime после смены провайдера embeddings.",
  "settings.embedding.readyNotice": "Настройки embeddings готовы.",
  "settings.embedding.toast.saved": "Настройки embeddings сохранены.",
  "settings.embedding.toast.saveFailed": "Не удалось сохранить настройки embeddings.",

  "settings.section.network.title": "Подключение",
  "settings.section.network.description":
    "Управление публичным relay для этого устройства.",
  "settings.section.network.reconnect": "Переподключиться",
  "settings.section.network.reconnecting": "Переподключение...",
  "settings.section.network.connect": "Подключиться",
  "settings.section.network.connecting": "Подключение...",
  "settings.section.network.disconnect": "Отключиться",
  "settings.section.network.disconnecting": "Отключение...",
  "settings.section.network.reconnectAria": "Переподключить сеть",
  "settings.section.network.connectAria": "Подключить сеть",
  "settings.section.network.disconnectAria": "Отключить сеть",

  "settings.section.account.showActivationUrl": "Показать ссылку активации",
  "settings.section.account.activationUrl": "Ссылка активации",
  "settings.section.account.browserActivationCheck":
    "Автоматическая проверка активации. Завершите вход в браузере, и Locram Desktop продолжит здесь.",
  "settings.section.account.browserActivationTransfer":
    "Pro уже активен на другом устройстве. Подтвердите перенос в браузере, затем вернитесь сюда, чтобы завершить активацию на этом устройстве",
  "settings.section.account.needBrowserLink": "Нужна ссылка для браузера?",
  "settings.section.account.openActivationLink": "Открыть ссылку активации",
  "settings.section.account.forgetDeviceConfirm":
    "Забыть это устройство? Потребуется заново активировать его перед использованием функций управляемой сети.",

  "settings.mcp.stdio.title": "Локальный MCP (STDIO)",
  "settings.mcp.stdio.description":
    "Скопируйте готовый фрагмент настройки для приложения на этом устройстве.",
  "settings.mcp.stdio.loading": "Проверяется launcher локального MCP.",
  "settings.mcp.stdio.unavailable":
    "Не удалось загрузить состояние launcher локального MCP.",
  "settings.mcp.stdio.launcherMissing":
    "Launcher локального MCP пока не готов. Закройте и снова откройте Locram Desktop, чтобы выполнить восстановление при запуске, затем снова скопируйте фрагмент.",
  "settings.mcp.stdio.snippet.json.title": "Cursor / Claude (JSON)",
  "settings.mcp.stdio.snippet.json.description":
    "Вставьте это в настройки MCP в Cursor или Claude Desktop.",
  "settings.mcp.stdio.snippet.yaml.title": "Codex (TOML)",
  "settings.mcp.stdio.snippet.yaml.description":
    "Вставьте это в ~/.codex/config.toml.",
  "settings.mcp.http.title": "Удалённый MCP (HTTP)",
  "settings.mcp.http.description.free":
    "Pro открывает удалённый MCP по HTTP для агентов вне этого устройства",
  "settings.mcp.http.description.setup":
    "Скопируйте URL MCP в коннектор, затем подтверждайте входящие запросы здесь.",
  "settings.mcp.http.description.operational":
    "Релей MCP на устройстве готов.",
  "settings.mcp.http.urlLabel": "URL MCP",
  "settings.mcp.http.action.upgrade": "Перейти на Pro",
  "settings.mcp.http.action.copyMcpUrl": "Скопировать URL MCP",
  "settings.mcp.http.action.connect": "Подключить",
  "settings.mcp.http.action.connecting": "Подключение...",
  "settings.mcp.http.action.disconnect": "Отключить",
  "settings.mcp.http.action.disconnecting": "Отключение...",
  "settings.mcp.http.action.reconnect": "Переподключить",
  "settings.mcp.http.action.reconnecting": "Переподключение...",
  "settings.mcp.http.browserOpened": "Браузер открыт.",
  "settings.mcp.http.browserBlocked":
    "Браузер заблокировал страницу. Откройте её вручную.",
  "settings.mcp.pendingApproval.title": "Ожидающие подтверждения",
  "settings.mcp.pendingApproval.description":
    "Подтверждайте OAuth-запросы от удалённых MCP-коннекторов для этого устройства.",
  "settings.mcp.pendingApproval.modal.title": "Подтвердить вход коннектора",
  "settings.mcp.pendingApproval.modal.description":
    "Удалённый коннектор просит войти через это устройство. Подтверждайте только если вы сами начали вход.",
  "settings.mcp.pendingApproval.modal.redirectHost": "Перенаправление входа",
  "settings.mcp.pendingApproval.modal.details": "Детали запроса",
  "settings.mcp.pendingApproval.loading": "Проверяем ожидающие подтверждения...",
  "settings.mcp.pendingApproval.empty": "Нет ожидающих подтверждений коннекторов.",
  "settings.mcp.pendingApproval.error":
    "Не удалось загрузить ожидающие подтверждения. Проверьте доступ к реле и повторите.",
  "settings.mcp.pendingApproval.clientId": "ID клиента",
  "settings.mcp.pendingApproval.redirectUri": "Redirect URI",
  "settings.mcp.pendingApproval.expiresAt": "Истекает",
  "settings.mcp.pendingApproval.approve": "Подтвердить",
  "settings.mcp.pendingApproval.approving": "Подтверждение...",
  "settings.mcp.pendingApproval.notNow": "Не сейчас",
  "settings.mcp.tab.pendingBadge": "{count} ожидает",
  "settings.mcp.pendingApproval.toast.approved":
    "Подтверждение отправлено. Вход в браузере должен завершиться в ближайшее время.",
  "settings.mcp.pendingApproval.toast.approveFailed":
    "Не удалось подтвердить запрос коннектора.",
  "settings.mcp.connectors.title": "Коннекторы",
  "settings.mcp.connectors.description": "Управление удалёнными MCP-клиентами для этого устройства.",
  "settings.mcp.connectors.loading": "Загрузка коннекторов...",
  "settings.mcp.connectors.empty": "Пока нет удалённых MCP-коннекторов.",
  "settings.mcp.connectors.error":
    "Не удалось загрузить коннекторы. Проверьте relay и повторите.",
  "settings.mcp.connectors.url": "URL",
  "settings.mcp.connectors.status.pending": "Ожидает",
  "settings.mcp.connectors.status.active": "Активен",
  "settings.mcp.connectors.status.authorized": "Авторизован",
  "settings.mcp.connectors.status.expired": "Истёк",
  "settings.mcp.connectedSessions.title": "Одобренные коннекторы",
  "settings.mcp.connectedSessions.description":
    "Удалённые MCP-клиенты, одобренные для этого устройства. Отзовите доступ, если коннектору нужно войти заново.",
  "settings.mcp.connectedSessions.loading": "Загрузка одобренных коннекторов...",
  "settings.mcp.connectedSessions.empty": "Пока нет одобренных удалённых коннекторов.",
  "settings.mcp.connectedSessions.error":
    "Не удалось загрузить одобренные коннекторы. Проверьте relay и повторите.",
  "settings.mcp.connectedSessions.details": "Детали коннектора",
  "settings.mcp.connectedSessions.approvedAt": "Одобрено",
  "settings.mcp.connectedSessions.accessExpiresAt": "Доступ истекает",
  "settings.mcp.connectedSessions.revoke": "Отозвать",
  "settings.mcp.connectedSessions.revoking": "Отзыв...",
  "settings.mcp.connectedSessions.revokeAll": "Отозвать все",
  "settings.mcp.connectedSessions.revokingAll": "Отзыв всех...",
  "settings.mcp.connectedSessions.state.active": "Активен",
  "settings.mcp.connectedSessions.state.refreshable": "Авторизован",
  "settings.mcp.connectedSessions.state.expired": "Истёк",
  "settings.mcp.connectedSessions.toast.revoked": "Доступ коннектора отозван.",
  "settings.mcp.connectedSessions.toast.revokeFailed": "Не удалось отозвать коннектор.",
  "settings.mcp.connectedSessions.toast.revokedAll": "Доступ всех коннекторов отозван.",
  "settings.mcp.connectedSessions.toast.revokeAllFailed": "Не удалось отозвать все коннекторы.",
  "settings.mcp.toolSurface.title": "Инструменты, доступные агентам",
  "settings.mcp.toolSurface.descriptionManage":
    "Выберите, какие дополнительные инструменты доступны ИИ-агентам.",
  "settings.mcp.toolSurface.descriptionReadOnly":
    "В Free доступны основные инструменты. Pro добавляет несколько баз, совместный доступ, управляемые обновления и расширенные инструменты для агентов",
  "settings.mcp.toolSurface.loading": "Загрузка",
  "settings.mcp.toolSurface.visibleCount": "видимых: {count}",
  "settings.mcp.toolSurface.required": "Основные",
  "settings.mcp.toolSurface.destructive": "Осторожно",
  "settings.mcp.toolSurface.toolCount": "инструментов: {count}",
  "settings.mcp.toolSurface.hideGroup": "Скрыть {label}",
  "settings.mcp.toolSurface.showGroup": "Показать {label}",
  "settings.mcp.toolSurface.loadError":
    "Не удалось загрузить настройки видимости инструментов.",

  "settings.status.active": "Активно",
  "settings.status.live": "В сети",
  "settings.status.connected": "Подключено",
  "settings.status.disconnected": "Отключено",
  "settings.status.pro": "Pro",
  "settings.status.admin": "Админ",
  "settings.status.free": "Free",
  "settings.status.activationPending": "Ожидает активации",
  "settings.status.activationTransferred": "Активация перенесена",
  "settings.status.connecting": "Подключение",
  "settings.status.reconnecting": "Переподключение",
  "settings.status.pending": "Ожидание",
  "settings.status.started": "Запущено",
  "settings.status.enrolled": "Зарегистрировано",
  "settings.status.configured": "Настроено",
  "settings.status.notConfigured": "Не настроено",
  "settings.status.notActivated": "Не активировано",
  "settings.status.activationRequired": "Требуется активация",
  "settings.status.reauthRequired": "Требуется повторный вход",
  "settings.status.unknown": "Неизвестно",
  "settings.status.failedRetryable": "Сбой (можно повторить)",
  "settings.status.grace": "Льготный период",
  "settings.status.interrupted": "Прервано",
  "settings.status.missing": "Отсутствует",
  "settings.status.offline": "Офлайн",
  "settings.status.stale": "Устарело",
  "settings.status.disabled": "Отключено",
  "settings.status.expired": "Истекло",
  "settings.status.failed": "Сбой",
  "settings.status.failedTerminal": "Окончательный сбой",
  "settings.status.invalid": "Недействительно",
  "settings.status.loaded": "Загружено",
  "settings.status.ready": "Готово",
  "settings.status.running": "Работает",
  "settings.status.unloaded": "Не загружено",
  "settings.status.degraded": "Деградировано",
  "settings.status.conflict": "Конфликт",
  "settings.status.needsRepair": "Нужен repair",
  "settings.status.dependencyMissing": "Зависимость отсутствует",
  "settings.status.dependencyIncomplete": "Зависимость не готова",
  "settings.status.revoked": "Отозвано",
  "settings.status.unsupported": "Не поддерживается",

  "settings.updater.unavailable":
    "Авто-обновление доступно только в собранном приложении.",
  "settings.updater.available": "Доступно обновление {version}.",
  "settings.updater.noNewer": "Новых обновлений сейчас нет.",
  "settings.updater.loadFailed":
    "Не удалось загрузить состояние авто-обновления.",
  "settings.updater.alreadyLatest":
    "У вас уже последняя версия этого канала.",
  "settings.updater.installingVersion":
    "Установка {version} из текущего канала...",
  "settings.updater.installedVersion":
    "Обновление {version} установлено. Перезапуск приложения...",
  "settings.updater.failed": "Сбой обновления приложения.",

  "settings.mcp.family.basicNotesGraph.label": "Заметки и граф",
  "settings.mcp.family.basicNotesGraph.description":
    "Основные инструменты для заметок, поиска и связей. Всегда включены.",
  "settings.mcp.family.multiBaseWorkingSet.label": "Несколько баз",
  "settings.mcp.family.multiBaseWorkingSet.description":
    "Работа с несколькими базами знаний одновременно.",
  "settings.mcp.family.localBaseAdministration.label": "Управление локальными базами",
  "settings.mcp.family.localBaseAdministration.description":
    "Создание, переименование, переключение и удаление ваших локальных баз.",
  "settings.mcp.family.artifactsExport.label": "Экспорт",
  "settings.mcp.family.artifactsExport.description":
    "Экспорт заметок и просмотр сохранённых выгрузок.",
  "settings.mcp.family.mergeTransfer.label": "Перенос и слияние",
  "settings.mcp.family.mergeTransfer.description":
    "Перенос или слияние заметок между базами с шагами проверки.",
  "settings.mcp.family.backupsRestore.label": "Резервные копии",
  "settings.mcp.family.backupsRestore.description":
    "Создание, управление и восстановление резервных копий базы.",
  "settings.mcp.family.smartFolders.label": "Умные папки",
  "settings.mcp.family.smartFolders.description":
    "Сохранение и повторное использование подборок заметок.",
  "settings.mcp.family.sourceScopedWorkflows.label": "Публикация",
  "settings.mcp.family.sourceScopedWorkflows.description":
    "Публикация заметок через шаги проверки и согласования.",
  "settings.mcp.family.diagnostics.label": "Диагностика",
  "settings.mcp.family.diagnostics.description":
    "Подробная проверка графа и поискового индекса.",
  "settings.mcp.family.destructiveTools.label": "Удаление и замена",
  "settings.mcp.family.destructiveTools.description":
    "Инструменты, которые удаляют или перезаписывают данные. Используйте осторожно.",
  "settings.mcp.family.indexingMaintenance.label": "Поисковый индекс",
  "settings.mcp.family.indexingMaintenance.description":
    "Обслуживание индекса, по которому ищутся заметки.",
  "settings.mcp.family.internal.label": "Служебные",
  "settings.mcp.family.internal.description":
    "Скрытые инструменты для разработки и будущих функций.",

  "settings.toast.activationUpdated": "Активация обновлена.",
  "settings.toast.activationAutoRepairFailed":
    "Активация сохранена, но автоматическое включение MCP не удалось. Откройте Maintenance и запустите Repair.",
  "settings.toast.disconnected": "Соединение разорвано.",
  "settings.toast.copiedToClipboard": "Скопировано в буфер обмена.",
  "settings.toast.copyFailed": "Не удалось скопировать в буфер обмена.",
  "settings.toast.signedOutOnDevice": "Выход выполнен на этом устройстве.",
  "settings.toast.deviceForgotten": "Это устройство забыто.",
  "settings.toast.mcpVisibilityUpdated": "Видимость MCP-инструментов обновлена.",
  "settings.toast.mcpVisibilityFailed":
    "Не удалось обновить видимость MCP-инструментов.",
  "settings.toast.noteLanguageUpdated": "Язык заметок сохранён.",
  "settings.toast.noteLanguageFailed": "Не удалось сохранить язык заметок.",

  "settings.activation.failure.sessionExpired": "Срок сессии активации истёк",
  "settings.activation.failure.sessionRedeemed":
    "Сессия активации уже использована",
  "settings.activation.failure.sessionUnredeemable":
    "Активация не может быть выполнена",
  "settings.activation.failure.transferRequired":
    "Pro уже активен на другом устройстве. Подтвердите перенос в браузере, чтобы перенести активацию сюда",
  "settings.activation.failure.activationTransferred": "Активация перенесена",
  "settings.activation.failure.retryable": "Активацию можно повторить",
  "settings.activation.failure.terminal": "Активация не может продолжиться",

  "settings.account.localWorkspace": "Локальное пространство",
  "settings.account.notConnected": "Нет соединения",
  "settings.account.connected": "Подключено",
  "settings.account.subscriptionRequired": "Нет подписки Pro",
  "settings.account.planFree": "Free",
  "settings.account.planTrial": "Trial",
  "settings.account.planPro": "Pro",
  "settings.account.planSuffix": "План {plan}",
  "settings.account.statusUnknown": "неизвестно",

  "settings.updater.action.installing": "Установка...",
  "settings.updater.action.checking": "Проверка...",
  "settings.updater.action.update": "Обновить",
  "settings.updater.action.upToDate": "Актуально",
  "settings.updater.action.check": "Проверить",

  "settings.networkStatus.reauthMessage":
    "Войдите снова, чтобы восстановить сеанс рабочего стола и возобновить сетевые функции.",
  "settings.networkStatus.activationState": "Активация: {state}.",
  "settings.entitlement.expired":
    "Подписка для этого устройства истекла. Войдите снова, чтобы обновить активацию. Локальные заметки останутся доступными, но сетевые функции будут недоступны.",
  "settings.entitlement.transferred":
    "Активация Pro перенесена на другое устройство. Локальные заметки здесь останутся доступными, но сетевые функции будут отключены, пока вы не активируете это устройство снова.",
  "settings.entitlement.revoked":
    "Эта подписка была отозвана. Войдите снова или свяжитесь с поддержкой перед повторным подключением сетевых функций.",
  "settings.entitlement.invalid":
    "Сохранённое подтверждение подписки не удалось проверить. Войдите снова, чтобы заменить его новой подписанной лицензией.",
  "settings.entitlement.missing":
    "Активация ещё не выпустила подписанный entitlement lease. Войдите снова, чтобы завершить активацию устройства перед использованием сетевых функций.",
  "settings.entitlement.grace":
    "Продлите подписку до конца льготного периода, чтобы избежать отключения сети.",
  "settings.entitlement.waitingForLease":
    "Подписанный entitlement lease ещё не получен.",
  "settings.entitlement.createdAfterActivation":
    "Подписанный entitlement lease создаётся после завершения активации.",

  "settings.connect.started": "Реле подключается.",
  "settings.connect.alreadyRunning": "Реле уже запущено.",
  "settings.connect.failed": "Реле не удалось запустить.",
  "settings.connect.disabled": "Доступ отключён.",
  "settings.connect.enrollmentRequired":
    "Перед подключением требуется активация этого устройства.",
  "settings.connect.reauthRequired":
    "Войдите снова, чтобы восстановить сеанс рабочего стола перед подключением.",
  "settings.connect.unsupported": "Среда выполнения не поддерживается.",
  "settings.connect.restarted": "Реле перезапущено.",

  "bases.error.loadBases": "Не удалось загрузить базы",
  "bases.error.switchBase": "Не удалось переключить базу",
  "bases.error.replaceActiveBase": "Не удалось заменить активную базу",
  "bases.tooltips.replaceActiveBase": "Заменить текущую базу",
  "bases.error.createBase": "Не удалось создать базу",
  "bases.error.renameBase": "Не удалось переименовать базу",
  "bases.error.unregisterBase":
    "Не удалось отменить регистрацию базы",
  "bases.error.deleteBase": "Не удалось удалить базу",
  "bases.error.updateMcpVisibility":
    "Не удалось обновить видимость MCP",
  "bases.error.updateSharedMcpVisibility":
    "Не удалось обновить видимость MCP общей базы",
  "bases.error.renameSharedBase":
    "Не удалось переименовать общую базу",
  "bases.error.removeSharedBase": "Не удалось удалить общую базу",
  "bases.error.backupSharedBase":
    "Не удалось создать резервную копию общей базы",
  "bases.error.backupBase": "Не удалось создать резервную копию базы",
  "bases.error.deleteBackup":
    "Не удалось удалить резервную копию",
  "bases.error.deleteExport": "Не удалось удалить экспорт",
  "bases.error.sharingRequiresPro":
    "Совместный доступ требует активной подписки Pro.",
  "bases.error.prepareSharing":
    "Не удалось подготовить базу к совместному доступу.",
  "bases.placeholder.baseName": "Имя базы",
  "bases.placeholder.baseDisplayName": "Отображаемое имя базы",
  "bases.confirm.unregister":
    "Отменить регистрацию «{name}»? Файл останется на диске.",
  "bases.confirm.unregisterLabel": "Отменить регистрацию",
  "bases.confirm.delete": "Удалить «{name}» вместе с файлом?",
  "bases.confirm.deleteLabel": "Удалить базу",
  "bases.confirm.removeFromShared":
    "Убрать «{name}» из расшаренного со мной?",
  "bases.builtIn.governance": "Управление графом",
  "bases.builtIn.documentation": "Документация",
  "bases.builtIn.adminPanel": "Панель администратора",
  "bases.builtIn.statusUnavailable": "Встроенные базы недоступны.",
  "bases.badge.inUse": "Активна",
  "bases.badge.mcpOff": "MCP выкл.",
  "bases.badge.agentRead": "Агент: чтение",
  "bases.sessionState.revoked": "Сессия отозвана",
  "bases.sessionState.expired": "Сессия истекла",
  "bases.sessionState.unavailable": "Нет локальной копии",
  "bases.builtIn.metric.version": "версия",
  "bases.builtIn.metric.pages": "страницы",
  "bases.builtIn.metric.read": "чтение",
  "bases.builtIn.metric.methods": "методы",
  "bases.builtIn.metric.status": "статус",
  "bases.builtIn.metric.surfaces": "поверхности",
  "bases.builtIn.metric.actions": "действия",
  "bases.builtIn.detail.status": "статус",
  "bases.builtIn.detail.minimumClient": "минимальный клиент",
  "bases.builtIn.detail.visibility": "видимость",
  "bases.builtIn.detail.auth": "авторизация",
  "bases.builtIn.detail.updated": "обновлено",
  "bases.builtIn.detail.projection": "проекция",
  "bases.builtIn.detail.hostname": "хост",
  "bases.builtIn.detail.defaultPage": "стартовая страница",
  "bases.builtIn.detail.roles": "роли",
  "bases.builtIn.detail.invalidTokens": "недействительные токены",
  "bases.builtIn.detail.updateAuthority": "право на обновления",
  "bases.builtIn.detail.governanceAuthority": "право на управление",
  "bases.builtIn.detail.registryAuthority": "право на реестр",
  "bases.builtIn.boolean.yes": "да",
  "bases.builtIn.boolean.no": "нет",
  "bases.builtIn.boolean.enabled": "включено",
  "bases.builtIn.boolean.disabled": "выключено",

  "common.copyAction": "Скопировать «{label}»",

  "network.stats.nodes": "узлов",
  "network.stats.links": "связей",
  "network.stats.size": "размер",
  "network.stats.activeOf": "{active} активных / {total} всего",
  "network.detail.entryId": "entry_id",
  "network.detail.recipient": "получатель",
  "network.detail.baseId": "base_id",
  "network.detail.grantId": "grant_id",
  "network.detail.created": "создано",
  "network.detail.activated": "активировано",
  "network.detail.expires": "истекает",
  "network.detail.path": "путь",
  "network.empty.enrollNetwork":
    "Подключите Brokered Network, чтобы управлять общими базами.",
  "network.empty.sharingRequiresPro":
    "Совместный доступ требует активной подписки Pro.",
  "network.empty.noManagedShares": "Управляемых общих баз пока нет.",

  "network.grantState.active": "Активный",
  "network.grantState.created": "Создан",
  "network.grantState.expired": "Истёк",
  "network.grantState.pending": "Не принят",
  "network.grantState.revoked": "Отозван",
  "network.activationState.active": "Активный",
  "network.activationState.created": "Создан",
  "network.activationState.pending": "Не принят",
  "network.permission.read": "Чтение",
  "network.permission.write": "Запись",
  "network.permission.admin": "Админ",

  "sharing.owner.title": "Общий доступ к базе",
  "sharing.owner.badge": "Владелец",
  "sharing.owner.subtitle":
    "Управляйте grant'ами shared-base, приглашайте получателей и задавайте уровни доступа.",
  "sharing.owner.close": "Закрыть общий доступ к базе",
  "sharing.owner.createSection.title": "Создать grant shared-base",
  "sharing.owner.createSection.description":
    "Выберите базу, задайте capability и срок действия перед выдачей доступа получателю.",
  "sharing.owner.grantsSection.title": "Grant'ы баз",
  "sharing.owner.grantsSection.description":
    "Поиск по базе, grant id, получателю, дате создания, сроку, entry id или статусу.",
  "sharing.owner.inviteSection.title": "Приглашение",
  "sharing.owner.inviteSection.description":
    "Настройте имя владельца и сообщение перед mint или копированием invite-ссылки.",
  "sharing.owner.detailsSection.title": "Детали grant",
  "sharing.owner.detailsSection.description": "Идентификаторы и временные метки жизненного цикла grant.",
  "sharing.owner.field.base": "База",
  "sharing.owner.field.recipient": "Идентификатор получателя",
  "sharing.owner.field.recipientPlaceholder": "acct_123 или e59dd763220443f8",
  "sharing.owner.field.expiresAt": "Истекает",
  "sharing.owner.field.expiresAtPlaceholder": "Выберите дату и время",
  "sharing.owner.field.capability": "Capability",
  "sharing.owner.field.ownerDisplayName": "Отображаемое имя владельца",
  "sharing.owner.field.ownerDisplayNamePlaceholder": "Alex",
  "sharing.owner.field.inviteMessage": "Сообщение приглашения",
  "sharing.owner.field.inviteMessagePlaceholder":
    "Используйте write-доступ для совместной работы с shared-base.",
  "sharing.owner.action.createGrant": "Создать grant",
  "sharing.owner.action.creating": "Создание…",
  "sharing.owner.action.mintInvite": "Mint invite",
  "sharing.owner.action.copyInvite": "Копировать invite",
  "sharing.owner.action.copyMintedInvite": "Копировать minted invite",
  "sharing.owner.action.revoke": "Отозвать",
  "sharing.owner.action.deleteGrant": "Удалить",
  "sharing.owner.base.inUse": "Используется",
  "sharing.owner.base.noSelection": "База не выбрана",
  "sharing.owner.base.activeSuffix": "используется",
  "sharing.owner.filter.allBases": "Все базы",
  "sharing.owner.filter.allStatuses": "Все статусы",
  "sharing.owner.search.placeholder": "Поиск grant'ов",
  "sharing.owner.search.baseFilter": "Фильтр grant'ов по базе",
  "sharing.owner.search.statusFilter": "Фильтр grant'ов по статусу",
  "sharing.owner.inviteLink.title": "Invite-ссылка",
  "sharing.owner.grant.recipient": "Получатель",
  "sharing.owner.detail.grantId": "Grant id",
  "sharing.owner.detail.entryId": "Entry id",
  "sharing.owner.detail.baseId": "Base id",
  "sharing.owner.detail.created": "Создан",
  "sharing.owner.detail.activated": "Активирован",
  "sharing.owner.detail.inviteSent": "Invite отправлен",
  "sharing.owner.detail.expires": "Истекает",
  "sharing.owner.dateTime.time": "Время",
  "sharing.owner.dateTime.clear": "Очистить",
  "sharing.owner.dateTime.now": "Сейчас",
  "sharing.owner.readiness.enrollRequired":
    "Подключите Brokered Network перед созданием shared-base доступа.",
  "sharing.owner.readiness.accessDisabled":
    "Managed network access отключён. Включите access перед mint invite.",
  "sharing.owner.readiness.noCredential":
    "Нет managed-public credentials. Завершите enrollment перед mint invite.",
  "sharing.owner.readiness.requiresManagedPublic":
    "Mint invite требует managed-public access. Переключите режим или переподключитесь.",
  "sharing.owner.notice.grantCreated": "Grant shared-base создан.",
  "sharing.owner.notice.grantRevoked": "Grant shared-base отозван.",
  "sharing.owner.notice.grantDeleted": "Grant shared-base удалён.",
  "sharing.owner.notice.inviteReady": "Invite готов.",
  "sharing.owner.notice.inviteCopied": "Invite-ссылка скопирована.",
  "sharing.owner.notice.createFailed": "Не удалось создать grant shared-base.",
  "sharing.owner.notice.revokeFailed": "Не удалось отозвать grant shared-base.",
  "sharing.owner.notice.deleteFailed": "Не удалось удалить grant shared-base.",
  "sharing.owner.notice.inviteFailed": "Не удалось выполнить mint base-share invite.",
  "sharing.owner.notice.copyInviteFailed": "Не удалось скопировать invite-ссылку.",
  "sharing.owner.loading.grants": "Загрузка grant'ов…",
  "sharing.owner.error.loadGrants": "Не удалось загрузить grant'ы: {message}",
  "sharing.owner.empty.noMatches": "Нет grant'ов по текущим фильтрам.",

  "bases.error.baseNotFound": "База не найдена",
};
