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
}
