// Health Tracker Application Logic with +2 hour timezone adjustment

// Конфигурация зон
const ZONES = {
    green: {
        systolic: [128, 140],
        diastolic: [78, 90],
        pulse: [65, 85],
        color: '#28a745'
    },
    yellow: {
        systolic: [141, 150],
        diastolic: [91, 100],
        pulse: [86, 100],
        color: '#ffc107'
    },
    orange: {
        systolic: [151, 170],
        diastolic: [101, 105],
        pulse: [101, 130],
        color: '#fd7e14'
    },
    red: {
        systolic: [171, 999],
        diastolic: [106, 999],
        pulse: [131, 999],
        color: '#dc3545'
    }
};

// Функция обработки сдвига времени на +2 часа
function adjustToTimezoneWithOffset(date, offset = 2) {
    const shiftedDate = new Date(date); // Создаём новую дату на основе переданной
    shiftedDate.setHours(shiftedDate.getHours() + offset); // Сдвигаем часы на значение offset
    return shiftedDate;
}

// Хранилище данных
class HealthDataStore {
    constructor() {
        this.storageKey = 'healthTrackerData';
        this.data = this.loadData();
    }

    loadData() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            entries: [],
            profile: {
                normalSystolic: [128, 140],
                normalDiastolic: [78, 90],
                normalPulse: [65, 85]
            }
        };
    }

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    addEntry(entry) {
        entry.id = Date.now();
        entry.datetime = adjustToTimezoneWithOffset(new Date(), 2).toISOString(); // Сдвиг на +2 часа
        entry.zone = this.calculateZone(entry);
        this.data.entries.unshift(entry);
        this.saveData();
    }

    getEntries(limit = null) {
        if (limit) {
            return this.data.entries.slice(0, limit);
        }
        return this.data.entries;
    }

    getLastNDays(days = 10) {
        const cutoffDate = adjustToTimezoneWithOffset(new Date(), 2); // Сдвиг на +2 часа
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return this.data.entries
            .filter(entry => new Date(entry.datetime) >= cutoffDate)
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    }

    calculateZone(entry) {
        const { systolic, diastolic } = entry;

        if (systolic >= ZONES.red.systolic[0] || diastolic >= ZONES.red.diastolic[0]) {
            return 'red';
        } else if (systolic >= ZONES.orange.systolic[0] || diastolic >= ZONES.orange.diastolic[0]) {
            return 'orange';
        } else if (systolic >= ZONES.yellow.systolic[0] || diastolic >= ZONES.yellow.diastolic[0]) {
            return 'yellow';
        } else {
            return 'green';
        }
    }

    exportToJSON() {
        return JSON.stringify(this.data, null, 2);
    }

    exportToMarkdown() {
        let md = '# Журнал показателей здоровья\n\n';

        this.data.entries.forEach(entry => {
            const date = adjustToTimezoneWithOffset(new Date(entry.datetime), 2).toLocaleString('ru-RU');
            md += `## ${date}\n\n`;
            md += `**АД:** ${entry.systolic}/${entry.diastolic} мм рт.ст.\n`;
            md += `**Пульс:** ${entry.pulse} уд/мин\n`;
            md += `**Зона:** ${this.getZoneEmoji(entry.zone)} ${this.getZoneName(entry.zone)}\n\n`;

            if (entry.sleep) {
                md += `**Сон:**\n`;
                md += `- Засыпание: ${entry.sleep.start || 'не указано'}\n`;
                md += `- Пробуждение: ${entry.sleep.end || 'не указано'}\n`;
                md += `- Качество: ${entry.sleep.quality}/5\n\n`;
            }

            md += `**Самочувствие:** ${entry.wellness}/5\n\n`;

            if (entry.triggers && entry.triggers.length > 0) {
                md += `**Триггеры:**\n`;
                entry.triggers.forEach(trigger => {
                    md += `- ${trigger.name}`;
                    if (trigger.details) {
                        md += ` (${trigger.details})`;
                    }
                    md += '\n';
                });
                md += '\n';
            }

            if (entry.symptoms && entry.symptoms.length > 0) {
                md += `**Симптомы:**\n`;
                entry.symptoms.forEach(symptom => {
                    md += `- ${symptom.name}`;
                    if (symptom.intensity) {
                        md += ` (интенсивность: ${symptom.intensity}/5)`;
                    }
                    md += '\n';
                });
                md += '\n';
            }

            if (entry.medications && entry.medications.length > 0) {
                md += `**Препараты:**\n`;
                entry.medications.forEach(med => {
                    md += `- ${med.name}`;
                    if (med.dose) {
                        md += ` (${med.dose} мг)`;
                    }
                    md += '\n';
                });
                md += '\n';
            }

            if (entry.notes) {
                md += `**Заметки:** ${entry.notes}\n\n`;
            }

            md += '---\n\n';
        });

        return md;
    }

    getZoneEmoji(zone) {
        const emojis = {
            green: '🟢',
            yellow: '🟡',
            orange: '🟠',
            red: '🔴'
        };
        return emojis[zone] || '';
    }

    getZoneName(zone) {
        const names = {
            green: 'Зелёная зона',
            yellow: 'Жёлтая зона',
            orange: 'Оранжевая зона',
            red: 'Красная зона'
        };
        return names[zone] || '';
    }
}

// Инициализация
const dataStore = new HealthDataStore();
let bpChart = null;
let pulseChart = null;

// При загрузке страницы создадим дату и применим сдвиг +2 часа
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    initializeCharts();
    updateVisualization();
    setupEventListeners();
});

// Установка текущей даты со сдвигом
function initializeForm() {
    const now = adjustToTimezoneWithOffset(new Date(), 2);
    const datetime = now.toISOString().slice(0, 16);
    document.getElementById('entryDate').value = datetime;

    // Обновление UI значений
    updateRangeValue('sleepQuality', 'sleepQualityValue');
    updateRangeValue('wellness', 'wellnessValue');
    updateRangeValue('neckSpasm', 'neckSpasmValue');
    updateRangeValue('stressLevel', 'stressLevelValue');
    updateRangeValue('occipitalPain', 'occipitalPainValue');
}

// Обновление отображаемого значения для range inputs
function updateRangeValue(rangeId, displayId) {
    const rangeInput = document.getElementById(rangeId);
    const displaySpan = document.getElementById(displayId);
    
    if (rangeInput && displaySpan) {
        displaySpan.textContent = rangeInput.value;
        rangeInput.addEventListener('input', function() {
            displaySpan.textContent = this.value;
        });
    }
}

// Инициализация графиков
function initializeCharts() {
    const bpCanvas = document.getElementById('bpChart');
    const pulseCanvas = document.getElementById('pulseChart');
    
    if (!bpCanvas || !pulseCanvas) {
        console.error('Chart canvases not found');
        return;
    }

    // Проверяем, доступен ли Chart.js
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js is not available. Charts will not be displayed.');
        // Показываем сообщение вместо графика
        const bpWrapper = bpCanvas.closest('.chart-wrapper');
        const pulseWrapper = pulseCanvas.closest('.chart-wrapper');
        if (bpWrapper) {
            bpWrapper.innerHTML = '<h3>Артериальное давление</h3><p class="no-data">График недоступен. Chart.js не загружен.</p>';
        }
        if (pulseWrapper) {
            pulseWrapper.innerHTML = '<h3>Пульс</h3><p class="no-data">График недоступен. Chart.js не загружен.</p>';
        }
        return;
    }

    // График артериального давления
    const bpCtx = bpCanvas.getContext('2d');
    bpChart = new Chart(bpCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Систолическое',
                    data: [],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Диастолическое',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 60,
                    max: 200,
                    title: {
                        display: true,
                        text: 'мм рт.ст.'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Дата'
                    }
                }
            }
        }
    });

    // График пульса
    const pulseCtx = pulseCanvas.getContext('2d');
    pulseChart = new Chart(pulseCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Пульс',
                data: [],
                borderColor: '#9b59b6',
                backgroundColor: 'rgba(155, 89, 182, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 40,
                    max: 150,
                    title: {
                        display: true,
                        text: 'уд/мин'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Дата'
                    }
                }
            }
        }
    });
}

// Обновление визуализации
function updateVisualization() {
    const last10Days = dataStore.getLastNDays(10);
    
    // Обновление графиков только если Chart.js доступен
    if (bpChart && pulseChart) {
        if (last10Days.length > 0) {
            const labels = last10Days.map(entry => {
                const date = new Date(entry.datetime);
                return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            });

            const systolicData = last10Days.map(entry => entry.systolic);
            const diastolicData = last10Days.map(entry => entry.diastolic);
            const pulseData = last10Days.map(entry => entry.pulse);

            // Обновление данных графика АД
            bpChart.data.labels = labels;
            bpChart.data.datasets[0].data = systolicData;
            bpChart.data.datasets[1].data = diastolicData;
            bpChart.update();

            // Обновление данных графика пульса
            pulseChart.data.labels = labels;
            pulseChart.data.datasets[0].data = pulseData;
            pulseChart.update();
        } else {
            // Очистка графиков если нет данных
            bpChart.data.labels = [];
            bpChart.data.datasets[0].data = [];
            bpChart.data.datasets[1].data = [];
            bpChart.update();

            pulseChart.data.labels = [];
            pulseChart.data.datasets[0].data = [];
            pulseChart.update();
        }
    }

    // Обновление таблицы записей (работает независимо от графиков)
    updateRecordsTable();
}

// Обновление таблицы записей
function updateRecordsTable() {
    const container = document.getElementById('recordsTableContainer');
    const entries = dataStore.getEntries(10);

    if (entries.length === 0) {
        container.innerHTML = '<p class="no-data">Нет записей. Добавьте первую запись.</p>';
        return;
    }

    let tableHTML = `
        <table class="records-table-element">
            <thead>
                <tr>
                    <th>Дата и время</th>
                    <th>АД</th>
                    <th>Пульс</th>
                    <th>Зона</th>
                    <th>Сон</th>
                    <th>Самочувствие</th>
                </tr>
            </thead>
            <tbody>
    `;

    entries.forEach(entry => {
        const date = new Date(entry.datetime);
        const dateStr = date.toLocaleString('ru-RU');
        const zoneClass = `zone-${entry.zone}`;
        const zoneEmoji = dataStore.getZoneEmoji(entry.zone);
        const zoneName = dataStore.getZoneName(entry.zone);
        
        const sleepQuality = entry.sleep ? `${entry.sleep.quality}/5` : '-';
        
        tableHTML += `
            <tr>
                <td>${dateStr}</td>
                <td>${entry.systolic}/${entry.diastolic}</td>
                <td>${entry.pulse}</td>
                <td class="${zoneClass}">${zoneEmoji} ${zoneName}</td>
                <td>${sleepQuality}</td>
                <td>${entry.wellness}/5</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработка формы
    const form = document.getElementById('healthForm');
    form.addEventListener('submit', handleFormSubmit);

    // Кнопка очистки формы
    const clearBtn = document.getElementById('clearForm');
    clearBtn.addEventListener('click', function() {
        form.reset();
        initializeForm();
    });

    // Кнопка экспорта в Markdown
    const exportMdBtn = document.getElementById('exportMd');
    exportMdBtn.addEventListener('click', function() {
        const md = dataStore.exportToMarkdown();
        downloadFile(md, 'health-tracker-export.md', 'text/markdown');
    });

    // Кнопка экспорта в JSON
    const exportJsonBtn = document.getElementById('exportJson');
    exportJsonBtn.addEventListener('click', function() {
        const json = dataStore.exportToJSON();
        downloadFile(json, 'health-tracker-export.json', 'application/json');
    });
}

// Обработка отправки формы
function handleFormSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    
    // Собираем базовые данные
    const entry = {
        systolic: parseInt(formData.get('systolic')),
        diastolic: parseInt(formData.get('diastolic')),
        pulse: parseInt(formData.get('pulse')),
        wellness: parseInt(formData.get('wellness'))
    };

    // Данные о сне
    entry.sleep = {
        start: formData.get('sleepStart') || null,
        end: formData.get('sleepEnd') || null,
        quality: parseInt(formData.get('sleepQuality'))
    };

    // Триггеры
    entry.triggers = [];
    const triggerCheckboxes = document.querySelectorAll('input[name="trigger"]:checked');
    triggerCheckboxes.forEach(checkbox => {
        const trigger = { name: getTriggerName(checkbox.value) };
        
        // Добавляем детали для специфических триггеров
        if (checkbox.value === 'sleep_deprivation') {
            const hours = document.getElementById('sleepHours').value;
            if (hours) trigger.details = `${hours} часов`;
        } else if (checkbox.value === 'head_tilt') {
            const duration = document.getElementById('headTiltDuration').value;
            if (duration) trigger.details = `${duration} минут`;
        } else if (checkbox.value === 'neck_spasm') {
            const level = document.getElementById('neckSpasm').value;
            if (level) trigger.details = `уровень ${level}/5`;
        } else if (checkbox.value === 'stress') {
            const level = document.getElementById('stressLevel').value;
            if (level) trigger.details = `уровень ${level}/5`;
        }
        
        entry.triggers.push(trigger);
    });

    // Симптомы
    entry.symptoms = [];
    const symptomCheckboxes = document.querySelectorAll('input[name="symptom"]:checked');
    symptomCheckboxes.forEach(checkbox => {
        const symptom = { name: getSymptomName(checkbox.value) };
        
        if (checkbox.value === 'occipital_pain') {
            const intensity = document.getElementById('occipitalPain').value;
            if (intensity) symptom.intensity = parseInt(intensity);
        }
        
        entry.symptoms.push(symptom);
    });

    // Другие симптомы
    const otherSymptoms = formData.get('otherSymptoms');
    if (otherSymptoms && otherSymptoms.trim()) {
        entry.symptoms.push({ name: otherSymptoms.trim() });
    }

    // Препараты
    entry.medications = [];
    const medicationCheckboxes = document.querySelectorAll('input[name="medication"]:checked');
    medicationCheckboxes.forEach(checkbox => {
        const medication = { name: getMedicationName(checkbox.value) };
        
        if (checkbox.value === 'aminalon') {
            const dose = document.getElementById('aminalonDose').value;
            if (dose) medication.dose = parseInt(dose);
        }
        
        entry.medications.push(medication);
    });

    // Другие препараты
    const otherMedications = formData.get('otherMedications');
    if (otherMedications && otherMedications.trim()) {
        entry.medications.push({ name: otherMedications.trim() });
    }

    // Заметки
    const notes = formData.get('notes');
    if (notes && notes.trim()) {
        entry.notes = notes.trim();
    }

    // Сохраняем запись
    dataStore.addEntry(entry);

    // Обновляем визуализацию
    updateVisualization();

    // Очищаем форму
    event.target.reset();
    initializeForm();

    // Показываем уведомление
    alert('✅ Запись успешно сохранена!');
}

// Вспомогательные функции для получения названий
function getTriggerName(value) {
    const names = {
        'sleep_deprivation': 'Недосып',
        'head_tilt': 'Работа с наклоном головы',
        'neck_spasm': 'Шейный спазм',
        'stress': 'Стресс/тревога',
        'weather': 'Погодные изменения',
        'temperature': 'Температурный дискомфорт'
    };
    return names[value] || value;
}

function getSymptomName(value) {
    const names = {
        'rhythm_disruption': 'Перебои ритма',
        'tinnitus': 'Шум в ушах',
        'occipital_pain': 'Затылочная боль',
        'instability': 'Неустойчивость'
    };
    return names[value] || value;
}

function getMedicationName(value) {
    const names = {
        'aminalon': 'Аминалон',
        'magnesium_b6': 'Магний + B6'
    };
    return names[value] || value;
}

// Функция для скачивания файла
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
