// Health Tracker Application Logic

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
        const cutoffDate = new Date();
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
            const date = new Date(entry.datetime).toLocaleString('ru-RU');
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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    initializeCharts();
    updateVisualization();
    setupEventListeners();
});

// Инициализация формы
function initializeForm() {
    // Установка текущей даты и времени
    const now = new Date();
    const datetime = now.toISOString().slice(0, 16);
    document.getElementById('entryDate').value = datetime;
    
    // Обновление значений range inputs
    updateRangeValue('sleepQuality', 'sleepQualityValue');
    updateRangeValue('wellness', 'wellnessValue');
    updateRangeValue('neckSpasm', 'neckSpasmValue');
    updateRangeValue('stressLevel', 'stressLevelValue');
    updateRangeValue('occipitalPain', 'occipitalPainValue');
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Форма
    document.getElementById('healthForm').addEventListener('submit', handleFormSubmit);
    
    // Кнопки
    document.getElementById('exportMd').addEventListener('click', exportMarkdown);
    document.getElementById('exportJson').addEventListener('click', exportJSON);
    document.getElementById('clearForm').addEventListener('click', clearForm);
    
    // Range inputs
    document.getElementById('sleepQuality').addEventListener('input', (e) => {
        updateRangeValue('sleepQuality', 'sleepQualityValue');
    });
    
    document.getElementById('wellness').addEventListener('input', (e) => {
        updateRangeValue('wellness', 'wellnessValue');
    });
    
    document.getElementById('neckSpasm').addEventListener('input', (e) => {
        updateRangeValue('neckSpasm', 'neckSpasmValue');
    });
    
    document.getElementById('stressLevel').addEventListener('input', (e) => {
        updateRangeValue('stressLevel', 'stressLevelValue');
    });
    
    document.getElementById('occipitalPain').addEventListener('input', (e) => {
        updateRangeValue('occipitalPain', 'occipitalPainValue');
    });
}

// Обновление отображаемого значения range input
function updateRangeValue(inputId, valueId) {
    const input = document.getElementById(inputId);
    const valueSpan = document.getElementById(valueId);
    valueSpan.textContent = input.value;
}

// Обработка отправки формы
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // Сбор данных
    const entry = {
        datetime: formData.get('entryDate'),
        systolic: parseInt(formData.get('systolic')),
        diastolic: parseInt(formData.get('diastolic')),
        pulse: parseInt(formData.get('pulse')),
        sleep: {
            start: formData.get('sleepStart') || null,
            end: formData.get('sleepEnd') || null,
            quality: parseInt(formData.get('sleepQuality'))
        },
        wellness: parseInt(formData.get('wellness')),
        triggers: collectTriggers(),
        symptoms: collectSymptoms(),
        medications: collectMedications(),
        notes: formData.get('notes') || ''
    };
    
    // Сохранение
    dataStore.addEntry(entry);
    
    // Обновление интерфейса
    updateVisualization();
    
    // Уведомление
    alert('✅ Запись успешно сохранена!');
    
    // Сброс формы
    clearForm();
}

// Сбор триггеров
function collectTriggers() {
    const triggers = [];
    const triggerCheckboxes = document.querySelectorAll('input[name="trigger"]:checked');
    
    triggerCheckboxes.forEach(checkbox => {
        const trigger = {
            name: getTriggerName(checkbox.value),
            value: checkbox.value,
            details: null
        };
        
        // Добавление деталей
        switch(checkbox.value) {
            case 'sleep_deprivation':
                const sleepHours = document.getElementById('sleepHours').value;
                if (sleepHours) trigger.details = `${sleepHours} ч`;
                break;
            case 'head_tilt':
                const duration = document.getElementById('headTiltDuration').value;
                if (duration) trigger.details = `${duration} мин`;
                break;
            case 'neck_spasm':
                const intensity = document.getElementById('neckSpasm').value;
                trigger.details = `${intensity}/5`;
                break;
            case 'stress':
                const level = document.getElementById('stressLevel').value;
                trigger.details = `${level}/5`;
                break;
        }
        
        triggers.push(trigger);
    });
    
    return triggers;
}

// Сбор симптомов
function collectSymptoms() {
    const symptoms = [];
    const symptomCheckboxes = document.querySelectorAll('input[name="symptom"]:checked');
    
    symptomCheckboxes.forEach(checkbox => {
        const symptom = {
            name: getSymptomName(checkbox.value),
            value: checkbox.value,
            intensity: null
        };
        
        if (checkbox.value === 'occipital_pain') {
            symptom.intensity = document.getElementById('occipitalPain').value;
        }
        
        symptoms.push(symptom);
    });
    
    const otherSymptoms = document.getElementById('otherSymptoms').value;
    if (otherSymptoms) {
        symptoms.push({
            name: 'Другое',
            value: 'other',
            details: otherSymptoms
        });
    }
    
    return symptoms;
}

// Сбор препаратов
function collectMedications() {
    const medications = [];
    const medCheckboxes = document.querySelectorAll('input[name="medication"]:checked');
    
    medCheckboxes.forEach(checkbox => {
        const medication = {
            name: getMedicationName(checkbox.value),
            value: checkbox.value,
            dose: null
        };
        
        if (checkbox.value === 'aminalon') {
            const dose = document.getElementById('aminalonDose').value;
            if (dose) medication.dose = dose;
        }
        
        medications.push(medication);
    });
    
    const otherMeds = document.getElementById('otherMedications').value;
    if (otherMeds) {
        medications.push({
            name: 'Другое',
            value: 'other',
            details: otherMeds
        });
    }
    
    return medications;
}

// Получение названий
function getTriggerName(value) {
    const names = {
        sleep_deprivation: 'Недосып',
        head_tilt: 'Работа с наклоном головы',
        neck_spasm: 'Шейный спазм',
        stress: 'Стресс/тревога',
        weather: 'Погодные изменения',
        temperature: 'Температурный дискомфорт'
    };
    return names[value] || value;
}

function getSymptomName(value) {
    const names = {
        rhythm_disruption: 'Перебои ритма',
        tinnitus: 'Шум в ушах',
        occipital_pain: 'Затылочная боль',
        instability: 'Неустойчивость'
    };
    return names[value] || value;
}

function getMedicationName(value) {
    const names = {
        aminalon: 'Аминалон',
        magnesium_b6: 'Магний + B6'
    };
    return names[value] || value;
}

// Очистка формы
function clearForm() {
    document.getElementById('healthForm').reset();
    initializeForm();
}

// Инициализация графиков
function initializeCharts() {
    const bpCtx = document.getElementById('bpChart').getContext('2d');
    const pulseCtx = document.getElementById('pulseChart').getContext('2d');
    
    // График давления
    bpChart = new Chart(bpCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Систолическое',
                    data: [],
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'Диастолическое',
                    data: [],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4
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
                    max: 180,
                    ticks: {
                        stepSize: 10
                    }
                }
            }
        }
    });
    
    // График пульса
    pulseChart = new Chart(pulseCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Пульс',
                data: [],
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                borderWidth: 2,
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
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 50,
                    max: 140,
                    ticks: {
                        stepSize: 10
                    }
                }
            }
        }
    });
}

// Обновление визуализации
function updateVisualization() {
    updateCharts();
    updateRecordsTable();
}

// Обновление графиков
function updateCharts() {
    const last10Days = dataStore.getLastNDays(10);
    
    const labels = last10Days.map(entry => {
        const date = new Date(entry.datetime);
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    });
    
    const systolicData = last10Days.map(entry => entry.systolic);
    const diastolicData = last10Days.map(entry => entry.diastolic);
    const pulseData = last10Days.map(entry => entry.pulse);
    
    // Обновление графика давления
    bpChart.data.labels = labels;
    bpChart.data.datasets[0].data = systolicData;
    bpChart.data.datasets[1].data = diastolicData;
    
    // Добавление цветовых зон на график давления
    bpChart.options.plugins.annotation = {
        annotations: {
            greenZone: {
                type: 'box',
                yMin: 128,
                yMax: 140,
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                borderColor: 'rgba(40, 167, 69, 0.3)',
                borderWidth: 1
            }
        }
    };
    
    bpChart.update();
    
    // Обновление графика пульса
    pulseChart.data.labels = labels;
    pulseChart.data.datasets[0].data = pulseData;
    pulseChart.update();
}

// Обновление таблицы записей
function updateRecordsTable() {
    const container = document.getElementById('recordsTableContainer');
    const entries = dataStore.getEntries(10);
    
    if (entries.length === 0) {
        container.innerHTML = '<p class="no-data">Нет записей. Добавьте первую запись.</p>';
        return;
    }
    
    let html = '<table><thead><tr>';
    html += '<th>Дата и время</th>';
    html += '<th>АД</th>';
    html += '<th>Пульс</th>';
    html += '<th>Зона</th>';
    html += '<th>Самочувствие</th>';
    html += '<th>Триггеры</th>';
    html += '</tr></thead><tbody>';
    
    entries.forEach(entry => {
        const date = new Date(entry.datetime).toLocaleString('ru-RU');
        const zoneEmoji = dataStore.getZoneEmoji(entry.zone);
        
        html += '<tr>';
        html += `<td>${date}</td>`;
        html += `<td>${entry.systolic}/${entry.diastolic}</td>`;
        html += `<td>${entry.pulse}</td>`;
        html += `<td class="zone-indicator">${zoneEmoji}</td>`;
        html += `<td>${entry.wellness}/5</td>`;
        html += `<td>${entry.triggers.length > 0 ? entry.triggers.map(t => t.name).join(', ') : '-'}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Экспорт в Markdown
function exportMarkdown() {
    const markdown = dataStore.exportToMarkdown();
    downloadFile('daily-log.md', markdown, 'text/markdown');
    alert('📄 Данные экспортированы в Markdown!');
}

// Экспорт в JSON
function exportJSON() {
    const json = dataStore.exportToJSON();
    downloadFile('health-data.json', json, 'application/json');
    alert('📦 Данные экспортированы в JSON!');
}

// Скачивание файла
function downloadFile(filename, content, contentType) {
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
