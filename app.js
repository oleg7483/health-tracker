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
    const shiftedDate = new Date(date);
    shiftedDate.setHours(shiftedDate.getHours() + offset);
    return shiftedDate;
}

// Функция расчёта продолжительности сна в часах и минутах
function calculateSleepDuration(startStr, endStr) {
    if (!startStr || !endStr) return null;

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    let startDate = new Date(2024, 0, 1, startH, startM);
    let endDate = new Date(2024, 0, 1, endH, endM);

    if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1); // сон через полночь
    }

    const diffMs = endDate - startDate;
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
        totalHours: totalMinutes / 60, // для возможного использования в анализе
        hours,
        minutes,
        formatted: minutes === 0 ? `${hours} ч` : `${hours} ч ${minutes} мин`
    };
}

// Обновление отображения продолжительности сна на форме
function updateSleepDurationDisplay() {
    const start = document.getElementById('sleepStart')?.value;
    const end = document.getElementById('sleepEnd')?.value;
    const display = document.getElementById('sleepDuration');

    if (!display) return;

    const duration = calculateSleepDuration(start, end);
    if (duration) {
        display.textContent = duration.formatted;
    } else {
        display.textContent = '— ч';
    }
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
        entry.datetime = adjustToTimezoneWithOffset(new Date(), 2).toISOString(); // +2 часа

        // Расчёт сна при сохранении
        if (entry.sleepStart || entry.sleepEnd) {
            const duration = calculateSleepDuration(entry.sleepStart, entry.sleepEnd);
            entry.sleep = {
                start: entry.sleepStart,
                end: entry.sleepEnd,
                quality: entry.sleepQuality,
                duration: duration ? duration.totalHours : null,
                formatted: duration ? duration.formatted : null
            };
        } else {
            entry.sleep = null;
        }

        // Обработка триггеров
        entry.triggers = this.collectTriggers();

        // Обработка симптомов
        entry.symptoms = this.collectSymptoms();

        // Обработка препаратов
        entry.medications = this.collectMedications();

        entry.zone = this.calculateZone(entry);
        this.data.entries.unshift(entry);
        this.saveData();
    }

    collectTriggers() {
        const triggers = [];
        const checkboxes = document.querySelectorAll('input[name="trigger"]:checked');
        checkboxes.forEach(cb => {
            const value = cb.value;
            let details = null;

            if (value === 'sleep_deprivation') {
                const hoursInput = document.getElementById('sleepHours');
                if (hoursInput?.value) {
                    details = `${hoursInput.value} ч`;
                }
            } else if (value === 'head_tilt') {
                const minsInput = document.getElementById('headTiltDuration');
                if (minsInput?.value) {
                    details = `${minsInput.value} мин`;
                }
            } else if (value === 'neck_spasm') {
                const level = document.getElementById('neckSpasm')?.value || '1';
                details = `${level}/5`;
            } else if (value === 'stress') {
                const level = document.getElementById('stressLevel')?.value || '1';
                details = `${level}/5`;
            }

            triggers.push({ name: this.getTriggerLabel(value), details });
        });
        return triggers;
    }

    collectSymptoms() {
        const symptoms = [];
        const checkboxes = document.querySelectorAll('input[name="symptom"]:checked');
        checkboxes.forEach(cb => {
            const value = cb.value;
            let intensity = null;

            if (value === 'occipital_pain') {
                intensity = document.getElementById('occipitalPain')?.value || '1';
            }

            symptoms.push({
                name: this.getSymptomLabel(value),
                intensity: intensity ? parseInt(intensity, 10) : null
            });
        });

        const other = document.getElementById('otherSymptoms')?.value?.trim();
        if (other) {
            symptoms.push({ name: `Другое: ${other}`, intensity: null });
        }

        return symptoms;
    }

    collectMedications() {
        const meds = [];
        const checkboxes = document.querySelectorAll('input[name="medication"]:checked');
        checkboxes.forEach(cb => {
            const value = cb.value;
            let dose = null;

            if (value === 'aminalon') {
                dose = document.getElementById('aminalonDose')?.value || null;
            }

            meds.push({
                name: this.getMedicationLabel(value),
                dose: dose ? parseInt(dose, 10) : null
            });
        });

        const other = document.getElementById('otherMedications')?.value?.trim();
        if (other) {
            meds.push({ name: other, dose: null });
        }

        return meds;
    }

    getTriggerLabel(value) {
        const labels = {
            sleep_deprivation: 'Недосып',
            head_tilt: 'Работа с наклоном головы',
            neck_spasm: 'Шейный спазм',
            stress: 'Стресс/тревога',
            weather: 'Погодные изменения',
            temperature: 'Температурный дискомфорт'
        };
        return labels[value] || value;
    }

    getSymptomLabel(value) {
        const labels = {
            rhythm_disruption: 'Перебои ритма',
            tinnitus: 'Шум в ушах',
            occipital_pain: 'Затылочная боль',
            instability: 'Неустойчивость'
        };
        return labels[value] || value;
    }

    getMedicationLabel(value) {
        const labels = {
            aminalon: 'Аминалон',
            magnesium_b6: 'Магний + B6'
        };
        return labels[value] || value;
    }

    getEntries(limit = null) {
        if (limit) {
            return this.data.entries.slice(0, limit);
        }
        return this.data.entries;
    }

    getLastNDays(days = 10) {
        const cutoffDate = adjustToTimezoneWithOffset(new Date(), 2);
        cutoffDate.setDate(cutoffDate.getDate() - days);
        return this.data.entries
            .filter(entry => new Date(entry.datetime) >= cutoffDate)
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    }

    calculateZone(entry) {
        const { systolic, diastolic } = entry;
        if (systolic >= ZONES.red.systolic[0] || diastolic >= ZONES.red.diastolic[0]) return 'red';
        if (systolic >= ZONES.orange.systolic[0] || diastolic >= ZONES.orange.diastolic[0]) return 'orange';
        if (systolic >= ZONES.yellow.systolic[0] || diastolic >= ZONES.yellow.diastolic[0]) return 'yellow';
        return 'green';
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
                md += `- Продолжительность: ${entry.sleep.formatted || '—'}\n`;
                md += `- Качество: ${entry.sleep.quality}/5\n\n`;
            }

            md += `**Самочувствие:** ${entry.wellness}/5\n\n`;

            if (entry.triggers && entry.triggers.length > 0) {
                md += `**Триггеры:**\n`;
                entry.triggers.forEach(trigger => {
                    md += `- ${trigger.name}`;
                    if (trigger.details) md += ` (${trigger.details})`;
                    md += '\n';
                });
                md += '\n';
            }

            if (entry.symptoms && entry.symptoms.length > 0) {
                md += `**Симптомы:**\n`;
                entry.symptoms.forEach(symptom => {
                    md += `- ${symptom.name}`;
                    if (symptom.intensity) md += ` (интенсивность: ${symptom.intensity}/5)`;
                    md += '\n';
                });
                md += '\n';
            }

            if (entry.medications && entry.medications.length > 0) {
                md += `**Препараты:**\n`;
                entry.medications.forEach(med => {
                    md += `- ${med.name}`;
                    if (med.dose) md += ` (${med.dose} мг)`;
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
        return { green: '🟢', yellow: '🟡', orange: '🟠', red: '🔴' }[zone] || '';
    }

    getZoneName(zone) {
        return {
            green: 'Зелёная зона',
            yellow: 'Жёлтая зона',
            orange: 'Оранжевая зона',
            red: 'Красная зона'
        }[zone] || '';
    }
}

// Инициализация
const dataStore = new HealthDataStore();
let bpChart = null;
let pulseChart = null;

// Обновление отображения значений слайдеров
function updateRangeValue(inputId, outputId) {
    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);
    if (input && output) {
        output.textContent = input.value;
        input.addEventListener('input', () => {
            output.textContent = input.value;
        });
    }
}

// Очистка формы
function clearForm() {
    document.getElementById('healthForm').reset();
    // Сброс отображаемых значений слайдеров
    document.getElementById('sleepQualityValue').textContent = '3';
    document.getElementById('wellnessValue').textContent = '5';
    document.getElementById('neckSpasmValue')?.textContent = '1';
    document.getElementById('stressLevelValue')?.textContent = '1';
    document.getElementById('occipitalPainValue')?.textContent = '1';
    updateSleepDurationDisplay(); // сброс отображения сна
}

// Экспорт
function exportMarkdown() {
    const md = dataStore.exportToMarkdown();
    downloadFile('health_tracker.md', md, 'text/markdown');
}

function exportJSON() {
    const json = dataStore.exportToJSON();
    downloadFile('health_tracker.json', json, 'application/json');
}

function downloadFile(filename, text, mimeType) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Обновление таблицы записей
function updateRecordsTable() {
    const container = document.getElementById('recordsTableContainer');
    const entries = dataStore.getEntries(10);
    if (entries.length === 0) {
        container.innerHTML = '<p class="no-data">Нет записей. Добавьте первую запись.</p>';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Дата и время</th>
                    <th>АД</th>
                    <th>Пульс</th>
                    <th>Сон</th>
                    <th>Самочувствие</th>
                    <th>Зона</th>
                </tr>
            </thead>
            <tbody>
    `;

    entries.forEach(entry => {
        const date = adjustToTimezoneWithOffset(new Date(entry.datetime), 2).toLocaleString('ru-RU');
        const sleepDisplay = entry.sleep?.formatted || '—';
        const zoneEmoji = dataStore.getZoneEmoji(entry.zone);
        html += `
            <tr>
                <td>${date}</td>
                <td>${entry.systolic}/${entry.diastolic}</td>
                <td>${entry.pulse}</td>
                <td>${sleepDisplay}</td>
                <td>${entry.wellness}/5</td>
                <td>${zoneEmoji}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Инициализация графиков (заглушка — можно расширить)
function initializeCharts() {
    // Здесь можно инициализировать Chart.js, если нужно
    // Пока просто заглушка
}

// Обновление визуализации
function updateVisualization() {
    updateRecordsTable();
    // Здесь можно обновлять графики, если реализованы
}

// Обработка отправки формы
function handleFormSubmit(event) {
    event.preventDefault();

    const formData = new FormData(document.getElementById('healthForm'));
    const entry = {
        entryDate: formData.get('entryDate'),
        systolic: parseInt(formData.get('systolic'), 10),
        diastolic: parseInt(formData.get('diastolic'), 10),
        pulse: parseInt(formData.get('pulse'), 10),
        sleepStart: formData.get('sleepStart') || null,
        sleepEnd: formData.get('sleepEnd') || null,
        sleepQuality: parseInt(formData.get('sleepQuality'), 10),
        wellness: parseInt(formData.get('wellness'), 10),
        otherSymptoms: formData.get('otherSymptoms') || '',
        otherMedications: formData.get('otherMedications') || '',
        notes: formData.get('notes') || ''
    };

    // Валидация основных полей
    if (!entry.systolic || !entry.diastolic || !entry.pulse) {
        alert('Пожалуйста, заполните все обязательные поля.');
        return;
    }

    dataStore.addEntry(entry);
    updateVisualization();
    clearForm();

    // Автоматически обновляем дату на текущую (+2)
    const now = adjustToTimezoneWithOffset(new Date(), 2);
    document.getElementById('entryDate').value = now.toISOString().slice(0, 16);
}

// Установка слушателей событий
function setupEventListeners() {
    document.getElementById('healthForm')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('clearForm')?.addEventListener('click', clearForm);
    document.getElementById('exportMd')?.addEventListener('click', exportMarkdown);
    document.getElementById('exportJson')?.addEventListener('click', exportJSON);

    // Слушатели для расчёта сна
    document.getElementById('sleepStart')?.addEventListener('change', updateSleepDurationDisplay);
    document.getElementById('sleepEnd')?.addEventListener('change', updateSleepDurationDisplay);

    // Инициализация значений слайдеров
    updateRangeValue('sleepQuality', 'sleepQualityValue');
    updateRangeValue('wellness', 'wellnessValue');
    updateRangeValue('neckSpasm', 'neckSpasmValue');
    updateRangeValue('stressLevel', 'stressLevelValue');
    updateRangeValue('occipitalPain', 'occipitalPainValue');
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function () {
    // Установка текущей даты (+2 часа)
    const now = adjustToTimezoneWithOffset(new Date(), 2);
    document.getElementById('entryDate').value = now.toISOString().slice(0, 16);

    setupEventListeners();
    updateSleepDurationDisplay(); // первоначальный расчёт (если есть данные)
    updateVisualization();
});
