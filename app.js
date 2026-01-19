// ===========================================
// IRL LEVEL - ОСНОВНОЙ ФАЙЛ JAVASCRIPT С SUPABASE
// ===========================================

// ===========================================
// 1. НАСТРОЙКА ПЕРЕМЕННЫХ И КОНСТАНТ
// ===========================================

// ⚠️ ВСТАВЬ СВОИ ДАННЫЕ SUPABASE СЮДА!
const SUPABASE_URL = 'https://rghcofervucgrkudsuvq.supabase.co'; // Project URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnaGNvZmVydnVjZ3JrdWRzdXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Mjk4MzgsImV4cCI6MjA4NDQwNTgzOH0.zUovZ4pUwRry_evfOQehl4PYYcM2I7LxSFVNzAVBITY'; // anon public key

// Основные DOM элементы
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('app');
const mainContent = document.getElementById('mainContent');
const playerCodeName = document.getElementById('playerCodeName');
const playerLevel = document.getElementById('playerLevel');

// Кнопки навигации
const navButtons = document.querySelectorAll('.nav-btn');

// Модальные окна
const contractModal = document.getElementById('contractModal');
const levelUpModal = document.getElementById('levelUpModal');

// Кнопки в модальных окнах
const acceptContractBtn = document.getElementById('acceptContractBtn');
const declineContractBtn = document.getElementById('declineContractBtn');
const closeLevelUpBtn = document.getElementById('closeLevelUpBtn');

// Глобальные переменные
let supabase = null;
// Telegram WebApp - БЕЗОПАСНАЯ проверка
let telegramApp = null;
let telegramUser = null;

// Проверяем есть ли Telegram вообще
if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
    telegramApp = window.Telegram.WebApp;
    console.log('✅ Telegram WebApp обнаружен');
} else {
    console.log('🌐 Запущено в браузере (не в Telegram)');
}
let player = {
    codeName: '',
    level: 1,
    xp: 0,
    resolve: 0,
    diamonds: 0,
    stats: { strength: 1, focus: 1, will: 1 },
    acceptedContract: false,
    lastQuestDate: null,
    achievements: []
};

// ===========================================
// 2. ИНИЦИАЛИЗАЦИЯ SUPABASE
// ===========================================

/**
 * Инициализирует Supabase
 */
function initSupabase() {
    try {
        supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase инициализирован!');
        return true;
    } catch (error) {
        console.error('❌ Ошибка инициализации Supabase:', error);
        return false;
    }
}

// ===========================================
// 3. ТЕЛЕГРАМ ИНТЕГРАЦИЯ
// ===========================================

/**
 * Инициализирует Telegram WebApp
 */
function initTelegram() {
    if (telegramApp) {
        telegramApp.expand();
        telegramUser = telegramApp.initDataUnsafe?.user;

        if (telegramUser) {
            console.log('👤 Пользователь Telegram:', telegramUser);

            // Показываем имя Telegram в интерфейсе
            const nameElement = document.getElementById('playerCodeName');
            if (nameElement) {
                if (telegramUser.username) {
                    nameElement.textContent = `@${telegramUser.username}`;
                } else if (telegramUser.first_name) {
                    nameElement.textContent = telegramUser.first_name;
                }
            }
        }
    } else {
        console.log('🌐 Запущено в браузере, не в Telegram');
    }
}

// ===========================================
// 4. ФУНКЦИИ ДЛЯ РАБОТЫ С БАЗОЙ ДАННЫХ
// ===========================================

/**
 * Сохраняет данные игрока в Supabase
 */
async function saveToSupabase() {
    if (!supabase || !telegramUser) {
        console.log('⚠️ Supabase не готов или нет пользователя');
        return false;
    }

    const userId = telegramUser.id.toString();

    try {
        const { error } = await supabase
            .from('players')
            .upsert({
                telegram_id: userId,
                telegram_username: telegramUser.username || '',
                telegram_first_name: telegramUser.first_name || '',
                telegram_last_name: telegramUser.last_name || '',
                code_name: player.codeName,
                level: player.level,
                xp: player.xp,
                resolve: player.resolve,
                diamonds: player.diamonds,
                stats: player.stats,
                achievements: player.achievements,
                last_quest_date: player.lastQuestDate,
                last_active: new Date().toISOString()
            });

        if (error) {
            console.error('❌ Ошибка сохранения в Supabase:', error);
            return false;
        }

        console.log('✅ Данные сохранены в Supabase для:', userId);
        return true;
    } catch (error) {
        console.error('❌ Ошибка при сохранении:', error);
        return false;
    }
}

/**
 * Загружает данные игрока из Supabase
 */
async function loadFromSupabase() {
    if (!supabase || !telegramUser) {
        console.log('⚠️ Supabase не готов или нет пользователя');
        return false;
    }

    const userId = telegramUser.id.toString();

    try {
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .eq('telegram_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Пользователь не найден - это нормально для первого входа
                console.log('👤 Пользователь не найден в базе, создадим нового');
                return false;
            }
            console.error('❌ Ошибка загрузки из Supabase:', error);
            return false;
        }

        if (data) {
            // Преобразуем данные из Supabase в наш формат
            player = {
                codeName: data.code_name || generateCodeName(),
                level: data.level || 1,
                xp: data.xp || 0,
                resolve: data.resolve || 0,
                diamonds: data.diamonds || 0,
                stats: data.stats || { strength: 1, focus: 1, will: 1 },
                achievements: data.achievements || [],
                acceptedContract: true,
                lastQuestDate: data.last_quest_date || null
            };

            console.log('✅ Данные загружены из Supabase для:', userId);
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ Ошибка при загрузке:', error);
        return false;
    }
}

/**
 * Сохраняет данные локально (как backup)
 */
function saveToLocalStorage() {
    const key = telegramUser ? `irlLevel_${telegramUser.id}` : 'irlLevel_local';
    localStorage.setItem(key, JSON.stringify(player));
}

/**
 * Загружает данные локально
 */
function loadFromLocalStorage() {
    const key = telegramUser ? `irlLevel_${telegramUser.id}` : 'irlLevel_local';
    const data = localStorage.getItem(key);
    if (data) {
        player = JSON.parse(data);
        return true;
    }
    return false;
}

/**
 * Основная функция сохранения данных
 */
async function savePlayerData() {
    // Всегда сохраняем локально
    saveToLocalStorage();

    // Пытаемся сохранить в Supabase
    if (supabase && telegramUser) {
        const saved = await saveToSupabase();
        if (saved) {
            console.log('✅ Данные синхронизированы с облаком!');
            return true;
        } else {
            console.log('⚠️ Не удалось синхронизировать с облаком');
            return false;
        }
    }

    return false;
}

/**
 * Основная функция загрузки данных
 */
async function loadPlayerData() {
    // Сначала пробуем загрузить из Supabase
    if (supabase && telegramUser) {
        const loaded = await loadFromSupabase();
        if (loaded) {
            return true;
        }
    }

    // Если не удалось, грузим локально
    return loadFromLocalStorage();
}

// ===========================================
// 5. ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ
// ===========================================

/**
 * Генерирует уникальное кодовое имя
 */
function generateCodeName() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = Math.floor(Math.random() * 900) + 100;
    const letter = letters[Math.floor(Math.random() * letters.length)];
    return letter + numbers;
}

/**
 * Показывает экран загрузки
 */
function showLoadingScreen(callback) {
    const loadingProgress = document.getElementById('loadingProgress');
    const loadingText = document.getElementById('loadingText');
    let progress = 0;

    const loadingMessages = [
        'Инициализация системы...',
        'Загрузка модулей...',
        'Проверка данных...',
        'Подготовка интерфейса...',
        'Активация прокачки...'
    ];

    const interval = setInterval(() => {
        progress += 2;
        loadingProgress.style.width = progress + '%';

        if (progress % 20 === 0) {
            const messageIndex = Math.floor(progress / 20) - 1;
            if (loadingMessages[messageIndex]) {
                loadingText.textContent = loadingMessages[messageIndex];
            }
        }

        if (progress >= 100) {
            clearInterval(interval);
            loadingText.textContent = 'Готово!';

            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    if (callback) callback();
                }, 500);
            }, 300);
        }
    }, 50);
}

/**
 * Инициализирует приложение
 */
async function initApp() {
    console.log('🚀 Инициализация приложения...');

    // Загружаем данные
    const hasSavedData = await loadPlayerData();

    if (hasSavedData && player.acceptedContract) {
        startGame();
    } else {
        showContract();
    }
}

/**
 * Показывает контракт
 */
function showContract() {
    appContainer.classList.add('hidden');
    contractModal.classList.remove('hidden');

    const exampleName = generateCodeName();
    document.querySelector('.contract-info').innerHTML += `
        <p style="text-align: center; margin-top: 20px; color: #00ff88;">
            <i class="fas fa-user-secret"></i> Ваш код: <strong>${exampleName}</strong>
        </p>
    `;
}

/**
 * Принимает контракт
 */
async function acceptContract() {
    console.log('📝 Контракт принят!');

    player = {
        codeName: generateCodeName(),
        level: 1,
        xp: 0,
        resolve: 10,
        diamonds: 5,
        stats: { strength: 1, focus: 1, will: 1 },
        acceptedContract: true,
        lastQuestDate: null,
        achievements: ['first_contract']
    };

    await savePlayerData();
    contractModal.classList.add('hidden');
    showNotification(`Добро пожаловать, ${player.codeName}!`, 'success');
    startGame();
}

/**
 * Отклоняет контракт
 */
function declineContract() {
    console.log('❌ Контракт отклонен');
    showNotification('Контракт отклонен. Возвращайтесь, когда будете готовы!', 'warning');

    // ВМЕСТО этого просто покажи сообщение:
    setTimeout(() => {
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; color: white;">
                <h2>Контракт отклонен</h2>
                <p>Обновите страницу чтобы начать заново</p>
                <button onclick="location.reload()" style="margin-top:20px; padding:10px 20px;">
                    НАЧАТЬ ЗАНОВО
                </button>
            </div>
        `;
    }, 2000);
}

/**
 * Начинает игру
 */
function startGame() {
    console.log('🎮 Начало игры!');
    updatePlayerInfo();
    appContainer.classList.remove('hidden');
    showTab('cabinet');
    setActiveNavButton('tabCabinet');
}

// ===========================================
// 6. ФУНКЦИИ ДЛЯ ВКЛАДОК (оставляем как были)
// ===========================================

function getCabinetContent() {
    return `
        <div class="card">
            <h2><i class="fas fa-home"></i> ЛИЧНЫЙ КАБИНЕТ</h2>
            
            <div class="player-info">
                <div class="player-header">
                    <div class="player-avatar">
                        <i class="fas fa-user-secret"></i>
                    </div>
                    <div class="player-name">
                        <h3>${player.codeName}</h3>
                        <p class="player-title">Новичок системы</p>
                    </div>
                </div>
                
                <div class="player-stats">
                    <div class="stat-item">
                        <div class="stat-label">Уровень</div>
                        <div class="stat-value level">${player.level}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Опыт</div>
                        <div class="stat-value xp">${player.xp}/100</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Resolve</div>
                        <div class="stat-value resolve">${player.resolve}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Бриллианты</div>
                        <div class="stat-value diamonds">${player.diamonds} <i class="fas fa-gem"></i></div>
                    </div>
                </div>
            </div>
            
            <div class="progress-container">
                <div class="progress-label">Прогресс до уровня ${player.level + 1}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${player.xp}%"></div>
                </div>
                <div class="progress-text">${player.xp}%</div>
            </div>
            
            <div class="characteristics">
                <h3><i class="fas fa-chart-line"></i> ХАРАКТЕРИСТИКИ</h3>
                <div class="characteristics-grid">
                    <div class="char-item">
                        <div class="char-icon strength"><i class="fas fa-dumbbell"></i></div>
                        <div class="char-info">
                            <div class="char-name">Сила</div>
                            <div class="char-value">${player.stats.strength.toFixed(1)}</div>
                        </div>
                    </div>
                    <div class="char-item">
                        <div class="char-icon focus"><i class="fas fa-brain"></i></div>
                        <div class="char-info">
                            <div class="char-name">Концентрация</div>
                            <div class="char-value">${player.stats.focus.toFixed(1)}</div>
                        </div>
                    </div>
                    <div class="char-item">
                        <div class="char-icon will"><i class="fas fa-fire"></i></div>
                        <div class="char-info">
                            <div class="char-name">Воля</div>
                            <div class="char-value">${player.stats.will.toFixed(1)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getQuestsContent() {
    const today = new Date().toISOString().split('T')[0];
    const canDoQuest = player.lastQuestDate !== today;

    return `
        <div class="card">
            <h2><i class="fas fa-tasks"></i> ЕЖЕДНЕВНЫЕ ЗАДАНИЯ</h2>
            <p class="quest-status">${canDoQuest ? '✅ Задания доступны!' : '⏳ Уже выполнено сегодня'}</p>
            
            <div class="quests-list">
                <div class="quest-item">
                    <div class="quest-header">
                        <div class="quest-icon"><i class="fas fa-dumbbell"></i></div>
                        <div class="quest-info">
                            <h3>10 отжиманий</h3>
                            <p class="quest-desc">Развивайте физическую силу</p>
                        </div>
                    </div>
                    <div class="quest-rewards">
                        <span class="reward"><i class="fas fa-star"></i> +10 XP</span>
                        <span class="reward"><i class="fas fa-bolt"></i> +3 Resolve</span>
                        <span class="reward"><i class="fas fa-dumbbell"></i> +0.1 к Силе</span>
                    </div>
                    <button class="quest-button" onclick="completeQuest('strength')" ${!canDoQuest ? 'disabled' : ''}>
                        ${canDoQuest ? 'ВЫПОЛНИТЬ' : 'ВЫПОЛНЕНО'}
                    </button>
                </div>
                
                <div class="quest-item">
                    <div class="quest-header">
                        <div class="quest-icon"><i class="fas fa-book"></i></div>
                        <div class="quest-info">
                            <h3>Читать 30 минут</h3>
                            <p class="quest-desc">Развивайте концентрацию</p>
                        </div>
                    </div>
                    <div class="quest-rewards">
                        <span class="reward"><i class="fas fa-star"></i> +15 XP</span>
                        <span class="reward"><i class="fas fa-bolt"></i> +5 Resolve</span>
                        <span class="reward"><i class="fas fa-brain"></i> +0.1 к Концентрации</span>
                    </div>
                    <button class="quest-button" onclick="completeQuest('focus')" ${!canDoQuest ? 'disabled' : ''}>
                        ${canDoQuest ? 'ВЫПОЛНИТЬ' : 'ВЫПОЛНЕНО'}
                    </button>
                </div>
                
                <div class="quest-item">
                    <div class="quest-header">
                        <div class="quest-icon"><i class="fas fa-sun"></i></div>
                        <div class="quest-info">
                            <h3>Ранний подъем (до 7:00)</h3>
                            <p class="quest-desc">Развивайте силу воли</p>
                        </div>
                    </div>
                    <div class="quest-rewards">
                        <span class="reward"><i class="fas fa-star"></i> +20 XP</span>
                        <span class="reward"><i class="fas fa-bolt"></i> +7 Resolve</span>
                        <span class="reward"><i class="fas fa-fire"></i> +0.1 к Воле</span>
                    </div>
                    <button class="quest-button" onclick="completeQuest('will')" ${!canDoQuest ? 'disabled' : ''}>
                        ${canDoQuest ? 'ВЫПОЛНИТЬ' : 'ВЫПОЛНЕНО'}
                    </button>
                </div>
            </div>
            
            ${!canDoQuest ? `
                <div class="quest-timer">
                    <i class="fas fa-clock"></i>
                    <span>Следующее задание через: <span id="timerCountdown">--:--:--</span></span>
                </div>
            ` : ''}
        </div>
    `;
}

function getShopContent() {
    return `
        <div class="card">
            <h2><i class="fas fa-store"></i> МАГАЗИН СИСТЕМЫ</h2>
            <div class="shop-balance">
                <i class="fas fa-wallet"></i>
                <span>Ваш баланс: <strong>${player.diamonds} <i class="fas fa-gem"></i></strong></span>
            </div>
            
            <div class="shop-items">
                <div class="shop-item">
                    <div class="item-header">
                        <div class="item-icon"><i class="fas fa-bolt"></i></div>
                        <h3>Бустер опыта</h3>
                        <div class="item-price">20 <i class="fas fa-gem"></i></div>
                    </div>
                    <p class="item-desc">+50% XP ко всем заданиям на 24 часа</p>
                    <button class="buy-button" onclick="buyItem('xp_booster', 20)">
                        КУПИТЬ
                    </button>
                </div>
                
                <div class="shop-item">
                    <div class="item-header">
                        <div class="item-icon"><i class="fas fa-heart"></i></div>
                        <h3>Доп. задание</h3>
                        <div class="item-price">30 <i class="fas fa-gem"></i></div>
                    </div>
                    <p class="item-desc">Открывает дополнительное задание на день</p>
                    <button class="buy-button" onclick="buyItem('extra_quest', 30)">
                        КУПИТЬ
                    </button>
                </div>
                
                <div class="shop-item">
                    <div class="item-header">
                        <div class="item-icon"><i class="fas fa-palette"></i></div>
                        <h3>Скин "Неон"</h3>
                        <div class="item-price">50 <i class="fas fa-gem"></i></div>
                    </div>
                    <p class="item-desc">Изменяет цветовую тему интерфейса</p>
                    <button class="buy-button" onclick="buyItem('neon_skin', 50)">
                        КУПИТЬ
                    </button>
                </div>
                
                <div class="shop-item">
                    <div class="item-header">
                        <div class="item-icon"><i class="fas fa-undo"></i></div>
                        <h3>Сброс характеристик</h3>
                        <div class="item-price">100 <i class="fas fa-gem"></i></div>
                    </div>
                    <p class="item-desc">Позволяет перераспределить очки характеристик</p>
                    <button class="buy-button" onclick="buyItem('reset_stats', 100)">
                        КУПИТЬ
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getAchievementsContent() {
    return `
        <div class="card">
            <h2><i class="fas fa-trophy"></i> ДОСТИЖЕНИЯ</h2>
            <p class="achievements-count">Открыто: ${player.achievements.length} из 12</p>
            
            <div class="achievements-list">
                <div class="achievement-item ${player.achievements.includes('first_contract') ? 'unlocked' : 'locked'}">
                    <div class="achievement-icon">
                        <i class="fas fa-file-signature"></i>
                    </div>
                    <div class="achievement-info">
                        <h3>Первый контракт</h3>
                        <p>Примите контракт системы</p>
                    </div>
                    <div class="achievement-status">
                        ${player.achievements.includes('first_contract') ? '✅' : '🔒'}
                    </div>
                </div>
                
                <div class="achievement-item ${player.achievements.includes('first_quest') ? 'unlocked' : 'locked'}">
                    <div class="achievement-icon">
                        <i class="fas fa-flag-checkered"></i>
                    </div>
                    <div class="achievement-info">
                        <h3>Первая победа</h3>
                        <p>Выполните первое задание</p>
                    </div>
                    <div class="achievement-status">
                        ${player.achievements.includes('first_quest') ? '✅' : '🔒'}
                    </div>
                </div>
                
                <div class="achievement-item locked">
                    <div class="achievement-icon">
                        <i class="fas fa-layer-group"></i>
                    </div>
                    <div class="achievement-info">
                        <h3>Уровень 5</h3>
                        <p>Достигните 5 уровня</p>
                    </div>
                    <div class="achievement-status">
                        ${player.level >= 5 ? '✅' : '🔒'}
                    </div>
                </div>
                
                <div class="achievement-item locked">
                    <div class="achievement-icon">
                        <i class="fas fa-calendar-day"></i>
                    </div>
                    <div class="achievement-info">
                        <h3>Семь дней силы</h3>
                        <p>Выполняйте задания 7 дней подряд</p>
                    </div>
                    <div class="achievement-status">
                        🔒
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getSettingsContent() {
    return `
        <div class="card">
            <h2><i class="fas fa-cog"></i> НАСТРОЙКИ</h2>
            
            <div class="settings-section">
                <h3><i class="fas fa-bell"></i> Уведомления</h3>
                <div class="setting-item">
                    <span>Напоминания о заданиях</span>
                    <label class="switch">
                        <input type="checkbox" checked>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <span>Уведомления об уровне</span>
                    <label class="switch">
                        <input type="checkbox" checked>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-section">
                <h3><i class="fas fa-gamepad"></i> Игровые настройки</h3>
                <div class="setting-item">
                    <span>Анимации</span>
                    <label class="switch">
                        <input type="checkbox" checked>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <span>Звуковые эффекты</span>
                    <label class="switch">
                        <input type="checkbox" checked>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-section">
                <h3><i class="fas fa-database"></i> Данные</h3>
                <button class="settings-button" onclick="exportData()">
                    <i class="fas fa-download"></i> Экспорт данных
                </button>
                <button class="settings-button" onclick="importData()">
                    <i class="fas fa-upload"></i> Импорт данных
                </button>
                <button class="settings-button danger" onclick="resetGame()">
                    <i class="fas fa-trash"></i> Сбросить игру
                </button>
            </div>
            
            <div class="settings-info">
                <p><i class="fas fa-info-circle"></i> Версия: 1.0.0</p>
                <p><i class="fas fa-code"></i> IRL Level System</p>
            </div>
        </div>
    `;
}

// ===========================================
// 7. ФУНКЦИИ ДЛЯ ВКЛАДОК И ИГРОВОЙ ЛОГИКИ
// ===========================================

function setActiveNavButton(buttonId) {
    navButtons.forEach(btn => btn.classList.remove('active'));
    const activeButton = document.getElementById(buttonId);
    if (activeButton) activeButton.classList.add('active');
}

function showTab(tabName) {
    let content = '';
    switch (tabName) {
        case 'cabinet': content = getCabinetContent(); break;
        case 'quests': content = getQuestsContent(); break;
        case 'shop': content = getShopContent(); break;
        case 'achievements': content = getAchievementsContent(); break;
        case 'settings': content = getSettingsContent(); break;
        default: content = `<div class="card"><h2>Ошибка</h2><p>Вкладка не найдена</p></div>`;
    }
    mainContent.innerHTML = content;
}

function updatePlayerInfo() {
    if (playerCodeName) playerCodeName.textContent = player.codeName;
    if (playerLevel) playerLevel.textContent = player.level;
    savePlayerData();
}

async function completeQuest(type) {
    const today = new Date().toISOString().split('T')[0];

    if (player.lastQuestDate === today) {
        showNotification('Вы уже выполнили задание сегодня!', 'warning');
        return;
    }

    let xpGain = 0, resolveGain = 0, questName = '';
    switch (type) {
        case 'strength': xpGain = 10; resolveGain = 3; questName = '10 отжиманий'; break;
        case 'focus': xpGain = 15; resolveGain = 5; questName = 'Чтение 30 минут'; break;
        case 'will': xpGain = 20; resolveGain = 7; questName = 'Ранний подъем'; break;
        default: return;
    }

    player.lastQuestDate = today;
    player.xp += xpGain;
    player.resolve += resolveGain;
    if (type === 'strength') player.stats.strength += 0.1;
    if (type === 'focus') player.stats.focus += 0.1;
    if (type === 'will') player.stats.will += 0.1;

    if (!player.achievements.includes('first_quest')) {
        player.achievements.push('first_quest');
    }

    await savePlayerData();

    if (player.xp >= 100) {
        levelUp();
    }

    updatePlayerInfo();
    showNotification(`✅ "${questName}" выполнено! +${xpGain} XP, +${resolveGain} Resolve`, 'success');
    setTimeout(() => showTab('quests'), 1000);
}

function levelUp() {
    player.level += 1;
    player.xp = player.xp - 100;
    player.diamonds += 5;
    player.resolve += 10;
    showLevelUpModal();
    if (player.level === 5 && !player.achievements.includes('level_5')) {
        player.achievements.push('level_5');
    }
}

function buyItem(itemId, price) {
    if (player.diamonds < price) {
        showNotification('Недостаточно бриллиантов!', 'error');
        return;
    }
    player.diamonds -= price;
    switch (itemId) {
        case 'xp_booster': showNotification('Бустер опыта активирован!', 'success'); break;
        case 'extra_quest': showNotification('Доп. задание разблокировано!', 'success'); break;
        case 'neon_skin': showNotification('Скин "Неон" применен!', 'success'); break;
        case 'reset_stats':
            showNotification('Характеристики сброшены!', 'success');
            player.stats = { strength: 1, focus: 1, will: 1 };
            break;
    }
    savePlayerData();
    updatePlayerInfo();
    showTab('shop');
}

function showLevelUpModal() {
    document.getElementById('oldLevel').textContent = player.level - 1;
    document.getElementById('newLevel').textContent = player.level;
    levelUpModal.classList.remove('hidden');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    const container = document.getElementById('notificationContainer');
    if (container) {
        container.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) notification.parentNode.removeChild(notification);
            }, 300);
        }, 5000);
    }
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

function resetGame() {
    if (confirm('Вы уверены? Все данные будут удалены!')) {
        localStorage.removeItem(telegramUser ? `irlLevel_${telegramUser.id}` : 'irlLevel_local');
        location.reload();
    }
}

function exportData() {
    const data = JSON.stringify(player);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `irl-level-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification('Данные экспортированы!', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                player = JSON.parse(event.target.result);
                savePlayerData();
                updatePlayerInfo();
                showNotification('Данные импортированы!', 'success');
                showTab('cabinet');
            } catch (error) {
                showNotification('Ошибка импорта данных!', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ===========================================
// 8. ОБРАБОТЧИКИ СОБЫТИЙ
// ===========================================

function setupEventListeners() {
    navButtons.forEach(button => {
        button.addEventListener('click', function () {
            const tab = this.getAttribute('data-tab');
            setActiveNavButton(this.id);
            showTab(tab);
        });
    });

    if (acceptContractBtn) acceptContractBtn.addEventListener('click', acceptContract);
    if (declineContractBtn) declineContractBtn.addEventListener('click', declineContract);
    if (closeLevelUpBtn) {
        closeLevelUpBtn.addEventListener('click', function () {
            levelUpModal.classList.add('hidden');
        });
    }
}

// ===========================================
// 9. ЗАПУСК ПРИЛОЖЕНИЯ
// ===========================================

window.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Приложение запускается...');

    // 1. Инициализируем Supabase
    initSupabase();

    // 2. Инициализируем Telegram
    initTelegram();

    // 3. Настраиваем обработчики
    setupEventListeners();

    // 4. Показываем загрузку
    showLoadingScreen(async function () {
        // 5. Инициализируем приложение
        await initApp();
    });
});