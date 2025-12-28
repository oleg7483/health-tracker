// Константы для зон давления
const ZONES = {
    green: {
        systolic: [128, 140],
        diastolic: [78, 90],
        pulse: [65, 85],
        label: '🟢 Зелёная',
        color: '#22c55e'
    },
    yellow: {
        systolic: [141, 150],
        diastolic: [91, 100],
        pulse: [86, 100],
        label: '🟡 Жёлтая',
        color: '#eab308'
    },
    orange: {
        systolic: [151, 170],
        diastolic: [101, 105],
        pulse: [101, 130],
        label: '🟠 Оранжевая',
        color: '#f97316'
    },
    red: {
        systolic: [171, 300],
        diastolic: [106, 200],
        pulse: [131, 300],
        label: '🔴 Красная',
        color: '#ef4444'
    }
};

// Глобальные переменные для графиков
let pressureChart = null;
let pulseChart = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeDatetime();
    loadData();
    initializeEventListeners();
    updateCharts();
    updateTable();
});

// Установка текущей даты и времени
function initializeDatetime() {
    const now = new Date();
    const dateTimeStr = now.toISOString().slice(0, 16);
    document.getElementById('datetime').value = dateTimeStr;
}

// Инициализация обработчиков событий
function initializeEventListeners() {
    document.getElementById('healthForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('clearForm').addEventListener('click', clearForm);
    document.getElementById('exportMarkdown').addEventListener('click', exportToMarkdown);
    document.getElementById('exportJSON').addEventListener('click', exportToJSON);
    document.getElementById('importJSON').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', importFromJSON);
}

// Обработка отправки формы
function handleFormSubmit(e) {
    e.preventDefault();
    
    const entry = {
        id: Date.now(),
        datetime: document.getElementById('datetime').value,
        systolic: parseInt(document.getElementById('systolic').value),
        diastolic: parseInt(document.getElementById('diastolic').value),
        pulse: parseInt(document.getElementById('pulse').value),
        sleep: {
            start: document.getElementById('sleepStart').value || null,
            end: document.getElementById('sleepEnd').value || null,
            quality: document.getElementById('sleepQuality').value || null,
            hours: document.getElementById('sleepHours').value || null
        },
        wellbeing: document.getElementById('wellbeing').value || null,
        triggers: {
            sleep: {
                enabled: document.getElementById('triggerSleep').checked,
                hours: document.getElementById('sleepHours').value || null
            },
            neck: {
                enabled: document.getElementById('triggerNeck').checked,
                duration: document.getElementById('neckDuration').value || null
            },
            spasm: {
                enabled: document.getElementById('triggerSpasm').checked,
                intensity: document.getElementById('spasmIntensity').value || null
            },
            stress: {
                enabled: document.getElementById('triggerStress').checked,
                level: document.getElementById('stressLevel').value || null
            },
            weather: document.getElementById('triggerWeather').checked,
            temperature: document.getElementById('triggerTemp').checked
        },
        symptoms: {
            rhythm: document.getElementById('symptomRhythm').checked,
            tinnitus: document.getElementById('symptomTinnitus').checked,
            headache: {
                enabled: document.getElementById('symptomHeadache').checked,
                intensity: document.getElementById('headacheIntensity').value || null
            },
            dizziness: document.getElementById('symptomDizziness').checked,
            other: document.getElementById('symptomOther').value || null
        },
        medications: {
            aminalon: {
                enabled: document.getElementById('medAminalon').checked,
                dose: document.getElementById('aminalonDose').value || null
            },
            magnesium: document.getElementById('medMagnesium').checked,
            other: document.getElementById('medOther').value || null
        },
        notes: document.getElementById('notes').value || null,
        zone: determineZone(
            parseInt(document.getElementById('systolic').value),
            parseInt(document.getElementById('diastolic').value),
            parseInt(document.getElementById('pulse').value)
        )
    };
    
    saveEntry(entry);
    clearForm();
    updateCharts();
    updateTable();
    
    alert('✅ Запись успешно сохранена!');
}

// Определение зоны по показателям
function determineZone(systolic, diastolic, pulse) {
    if (systolic >= ZONES.red.systolic[0] || diastolic >= ZONES.red.diastolic[0] || pulse >= ZONES.red.pulse[0]) {
        return 'red';
    }
    if (systolic >= ZONES.orange.systolic[0] || diastolic >= ZONES.orange.diastolic[0] || pulse >= ZONES.orange.pulse[0]) {
        return 'orange';
    }
    if (systolic >= ZONES.yellow.systolic[0] || diastolic >= ZONES.yellow.diastolic[0] || pulse >= ZONES.yellow.pulse[0]) {
        return 'yellow';
    }
    return 'green';
}

// Сохранение записи в localStorage
function saveEntry(entry) {
    const data = loadData();
    data.entries.push(entry);
    localStorage.setItem('healthTrackerData', JSON.stringify(data));
}

// Загрузка данных из localStorage
function loadData() {
    const stored = localStorage.getItem('healthTrackerData');
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

// Очистка формы
function clearForm() {
    document.getElementById('healthForm').reset();
    initializeDatetime();
}

// Обновление графиков
function updateCharts() {
    const data = loadData();
    const entries = data.entries
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
        .slice(-10); // Последние 10 дней
    
    if (entries.length === 0) {
        return;
    }
    
    const labels = entries.map(e => {
        const date = new Date(e.datetime);
        return `${date.getDate()}.${date.getMonth() + 1} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    });
    
    const systolicData = entries.map(e => e.systolic);
    const diastolicData = entries.map(e => e.diastolic);
    const pulseData = entries.map(e => e.pulse);
    
    // График давления
    const pressureCtx = document.getElementById('pressureChart').getContext('2d');
    if (pressureChart) {
        pressureChart.destroy();
    }
    
    pressureChart = new Chart(pressureCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Систолическое',
                    data: systolicData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'Диастолическое',
                    data: diastolicData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
                        stepSize: 20
                    },
                    grid: {
                        color: function(context) {
                            const value = context.tick.value;
                            // Зелёная зона
                            if (value >= 78 && value <= 140) return 'rgba(34, 197, 94, 0.1)';
                            // Жёлтая зона
                            if (value >= 91 && value <= 150) return 'rgba(234, 179, 8, 0.1)';
                            return 'rgba(226, 232, 240, 1)';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    // График пульса
    const pulseCtx = document.getElementById('pulseChart').getContext('2d');
    if (pulseChart) {
        pulseChart.destroy();
    }
    
    pulseChart = new Chart(pulseCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Пульс',
                    data: pulseData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
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
                    min: 50,
                    max: 140,
                    ticks: {
                        stepSize: 10
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Обновление таблицы записей
function updateTable() {
    const data = loadData();
    const tbody = document.getElementById('entriesTableBody');
    
    if (data.entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">Нет записей. Добавьте первую запись.</td></tr>';
        return;
    }
    
    const entries = data.entries
        .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
        .slice(0, 10);
    
    tbody.innerHTML = entries.map(entry => {
        const date = new Date(entry.datetime);
        const dateStr = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        const zone = ZONES[entry.zone];
        const sleepHours = entry.sleep.hours || calculateSleepHours(entry.sleep.start, entry.sleep.end);
        
        return `
            <tr>
                <td>${dateStr}</td>
                <td>${entry.systolic}/${entry.diastolic}</td>
                <td>${entry.pulse}</td>
                <td><span class="zone-indicator zone-${entry.zone}">${zone.label}</span></td>
                <td>${sleepHours ? sleepHours + ' ч' : '-'}</td>
                <td><button class="btn btn-delete" onclick="deleteEntry(${entry.id})">Удалить</button></td>
            </tr>
        `;
    }).join('');
}

// Расчёт часов сна
function calculateSleepHours(start, end) {
    if (!start || !end) return null;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let hours = endH - startH;
    let minutes = endM - startM;
    
    if (hours < 0) hours += 24; // Если сон через полночь
    if (minutes < 0) {
        hours -= 1;
        minutes += 60;
    }
    
    return (hours + minutes / 60).toFixed(1);
}

// Удаление записи
function deleteEntry(id) {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
        return;
    }
    
    const data = loadData();
    data.entries = data.entries.filter(e => e.id !== id);
    localStorage.setItem('healthTrackerData', JSON.stringify(data));
    
    updateCharts();
    updateTable();
    alert('✅ Запись удалена!');
}

// Экспорт в Markdown
function exportToMarkdown() {
    const data = loadData();
    if (data.entries.length === 0) {
        alert('❌ Нет данных для экспорта');
        return;
    }
    
    let markdown = '# Журнал показателей здоровья\n\n';
    markdown += `**Дата экспорта:** ${new Date().toLocaleString('ru-RU')}\n\n`;
    markdown += '## Записи\n\n';
    markdown += '| Дата и время | АД (сист/диаст) | Пульс | Зона | Сон (ч) | Самочувствие | Заметки |\n';
    markdown += '|--------------|-----------------|-------|------|---------|--------------|----------|\n';
    
    data.entries
        .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
        .forEach(entry => {
            const date = new Date(entry.datetime);
            const dateStr = date.toLocaleString('ru-RU');
            const zone = ZONES[entry.zone].label;
            const sleepHours = entry.sleep.hours || calculateSleepHours(entry.sleep.start, entry.sleep.end) || '-';
            const wellbeing = entry.wellbeing || '-';
            const notes = entry.notes ? entry.notes.substring(0, 50) : '-';
            
            markdown += `| ${dateStr} | ${entry.systolic}/${entry.diastolic} | ${entry.pulse} | ${zone} | ${sleepHours} | ${wellbeing}/5 | ${notes} |\n`;
        });
    
    markdown += '\n## Статистика\n\n';
    const avgSystolic = (data.entries.reduce((sum, e) => sum + e.systolic, 0) / data.entries.length).toFixed(1);
    const avgDiastolic = (data.entries.reduce((sum, e) => sum + e.diastolic, 0) / data.entries.length).toFixed(1);
    const avgPulse = (data.entries.reduce((sum, e) => sum + e.pulse, 0) / data.entries.length).toFixed(1);
    
    markdown += `- **Среднее систолическое АД:** ${avgSystolic} мм рт.ст.\n`;
    markdown += `- **Среднее диастолическое АД:** ${avgDiastolic} мм рт.ст.\n`;
    markdown += `- **Средний пульс:** ${avgPulse} уд/мин\n`;
    markdown += `- **Всего записей:** ${data.entries.length}\n`;
    
    downloadFile('health-log.md', markdown, 'text/markdown');
    alert('✅ Экспорт в Markdown завершён!');
}

// Экспорт в JSON
function exportToJSON() {
    const data = loadData();
    if (data.entries.length === 0) {
        alert('❌ Нет данных для экспорта');
        return;
    }
    
    const json = JSON.stringify(data, null, 2);
    downloadFile('health-data.json', json, 'application/json');
    alert('✅ Экспорт в JSON завершён!');
}

// Импорт из JSON
function importFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.entries || !Array.isArray(data.entries)) {
                throw new Error('Неверный формат данных');
            }
            
            if (confirm(`Импортировать ${data.entries.length} записей? Существующие данные будут заменены.`)) {
                localStorage.setItem('healthTrackerData', JSON.stringify(data));
                updateCharts();
                updateTable();
                alert('✅ Данные успешно импортированы!');
            }
        } catch (error) {
            alert('❌ Ошибка при импорте: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    // Сброс input для возможности повторного выбора того же файла
    event.target.value = '';
}

// Скачивание файла
function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
