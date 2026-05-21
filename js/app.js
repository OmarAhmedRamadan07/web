// =========================================================
// 1. Configuration & Global Variables
// =========================================================
const API_KEY = 'dc6995fce2cbfe9781f339cb5d7a2288'; 

let map;
let marker;
let forecastChartInstance = null; 

// Store hourly data globally to allow tab switching without re-fetching
let currentHourlyData = null; 
let currentHourlyIndex = 0;

// =========================================================
// 2. Data Adapters & Helpers
// =========================================================
function wmoToDescription(code) {
    if (code === 0) return { desc: "clear sky", id: 800, icon: "01d", main: "Clear" };
    if (code === 1) return { desc: "few clouds", id: 801, icon: "02d", main: "Clouds" };
    if (code === 2) return { desc: "scattered clouds", id: 802, icon: "03d", main: "Clouds" };
    if (code === 3) return { desc: "overcast clouds", id: 804, icon: "04d", main: "Clouds" };
    if (code === 45 || code === 48) return { desc: "fog", id: 741, icon: "50d", main: "Fog" };
    if (code >= 51 && code <= 55) return { desc: "drizzle", id: 300, icon: "09d", main: "Drizzle" };
    if (code >= 61 && code <= 65) return { desc: "moderate rain", id: 501, icon: "10d", main: "Rain" };
    if (code >= 71 && code <= 77) return { desc: "light snow", id: 600, icon: "13d", main: "Snow" };
    if (code >= 80 && code <= 82) return { desc: "heavy intensity rain", id: 502, icon: "09d", main: "Rain" };
    if (code >= 95 && code <= 99) return { desc: "thunderstorm", id: 200, icon: "11d", main: "Thunderstorm" };
    return { desc: "clear sky", id: 800, icon: "01d", main: "Clear" }; 
}

function getWeatherIcon(condition) {
    const desc = condition.toLowerCase();
    const path = "images/"; 
    if (desc.includes("clear")) return `${path}clear.png`;
    if (desc.includes("few clouds")) return `${path}Few-clouds.png`;
    if (desc.includes("scattered clouds")) return `${path}Scattered-clouds.png`;
    if (desc.includes("broken clouds")) return `${path}Broken-clouds.png`;
    if (desc.includes("overcast clouds")) return `${path}Overcast-clouds.png`;
    if (desc.includes("light rain")) return `${path}Light-rain.png`;
    if (desc.includes("moderate rain")) return `${path}Moderate-rain.png`;
    if (desc.includes("heavy intensity rain")) return `${path}Heavy-intensity-rain.png`;
    if (desc.includes("thunderstorm with rain")) return `${path}Thunderstorm-with-rain.png`;
    if (desc.includes("thunderstorm")) return `${path}Thunderstorm.png`;
    if (desc.includes("light snow")) return `${path}Light-snow.png`;
    if (desc.includes("heavy snow")) return `${path}Heavy-snow.png`;
    if (desc.includes("drizzle")) return `${path}Drizzle.png`;
    if (desc.includes("mist")) return `${path}Mist.png`;
    if (desc.includes("fog")) return `${path}Fog.png`;
    return `${path}icon.png`; 
}

function getWindDirection(degree) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(degree / 45) % 8];
}

function formatTime(isoString) {
    if (!isoString) return "--:--";
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// =========================================================
// 3. Audio & Video Management
// =========================================================
const weatherSounds = {
    'storm-heavy': new Audio('Audios/storm-heavy.mp3'),
    'storm-light': new Audio('Audios/storm-light.mp3'),
    'thunder-only': new Audio('Audios/thunder-only.mp3'),
    'rain-heavy': new Audio('Audios/rain-heavy.mp3'),
    'rain-medium': new Audio('Audios/rain-medium.mp3'),
    'rain-light': new Audio('Audios/rain-light.mp3'),
    'snow': new Audio('Audios/snow.mp3'),
    'wind-strong': new Audio('Audios/wind-strong.mp3'),
    'wind-light': new Audio('Audios/wind-light.mp3'),
    'clear-day': new Audio('Audios/clear-day.mp3'),
    'clear-night': new Audio('Audios/clear-night.mp3'),
    'click': new Audio('Audios/click.mp3'),
    'success': new Audio('Audios/success.mp3'),
    'error': new Audio('Audios/error.mp3') 
};

Object.keys(weatherSounds).forEach(key => {
    if(!['click', 'success', 'error'].includes(key)) weatherSounds[key].loop = true;
});

let currentPlayingSound = null;

function playClickSound() {
    if (weatherSounds['click']) {
        weatherSounds['click'].currentTime = 0;
        weatherSounds['click'].play().catch(() => {});
    }
}

function playWeatherSound(data) {
    if (currentPlayingSound) {
        currentPlayingSound.pause();
        currentPlayingSound.currentTime = 0;
    }
    const code = data.weather[0].id;
    let soundKey = '';
    if (code >= 200 && code <= 202) soundKey = 'storm-heavy';
    else if (code >= 210 && code <= 232) soundKey = 'storm-light';
    else if (code >= 300 && code <= 501) soundKey = 'rain-light';
    else if (code >= 502 && code <= 531) soundKey = 'rain-heavy';
    else if (code >= 600 && code <= 622) soundKey = 'snow';
    else if (code === 800) soundKey = data.weather[0].icon.includes('n') ? 'clear-night' : 'clear-day';
    else if (code === 801 || code === 802) soundKey = 'wind-light';
    else if (code === 803 || code === 804) soundKey = 'wind-strong';

    if (soundKey && weatherSounds[soundKey]) {
        currentPlayingSound = weatherSounds[soundKey];
        currentPlayingSound.play().catch(() => {});
    }
}

const updateBackground = (data) => {
    const desc = data.weather[0].description.toLowerCase();
    const icon = data.weather[0].icon; 
    const bgVideo = document.getElementById('bg-video');
    let videoSrc = 'videos/clear-day.mp4'; 
    if (desc.includes("clear")) videoSrc = icon.includes('n') ? 'videos/clear-night.mp4' : 'videos/clear-day.mp4';
    else if (desc.includes("cloud")) videoSrc = 'videos/clouds-heavy.mp4';
    else if (desc.includes("light rain") || desc.includes("drizzle")) videoSrc = 'videos/rain-light.mp4';
    else if (desc.includes("rain")) videoSrc = 'videos/rain-heavy.mp4';
    else if (desc.includes("thunderstorm")) videoSrc = 'videos/storm.mp4';
    else if (desc.includes("snow")) videoSrc = 'videos/snow.mp4';
    else if (desc.includes("mist") || desc.includes("fog")) videoSrc = 'videos/fog.mp4';

    if (!bgVideo.src.includes(videoSrc)) {
        bgVideo.src = videoSrc;
        bgVideo.play().catch(() => {});
    }
};

// =========================================================
// 4. Map & Fetch Operations
// =========================================================
const getExtendedMeteoUrl = (lat, lon) => {
    // 🟢 Updated URL: Now requesting hourly data (temperature, precip, wind, humidity, UV)
    return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m,relative_humidity_2m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum&past_days=3&forecast_days=10&timezone=auto`;
};

const updateMap = (lat, lon, temp, city) => {
    if (!map) {
        map = L.map('map').setView([lat, lon], 10);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors, © CARTO'
        }).addTo(map);

        map.on('click', async (e) => {
            playClickSound(); 
            const { lat, lng } = e.latlng;
            if(typeof Swal !== 'undefined') Swal.showLoading();

            try {
                const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lng}&limit=1&appid=${API_KEY}`);
                const geoData = await geoRes.json();
                let preciseLocation = geoData && geoData.length > 0 ? (geoData[0].local_names?.en || geoData[0].name) : "Unknown Area";

                const res = await fetch(getExtendedMeteoUrl(lat, lng));
                const meteoData = await res.json();

                const currentWmo = wmoToDescription(meteoData.current.weather_code);
                const currentData = {
                    name: preciseLocation,
                    coord: { lat: lat, lon: lng },
                    main: { temp: meteoData.current.temperature_2m },
                    sys: { country: geoData[0]?.country || "" },
                    weather: [{ id: currentWmo.id, description: currentWmo.desc, icon: currentWmo.icon }]
                };

                updateAllUI(currentData, meteoData);
                saveCityToHistory(preciseLocation);
                if(typeof Swal !== 'undefined') Swal.close();
            } catch (err) {
                if(typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Oops...', text: 'Failed to fetch location data.' });
            }
        });
    } else {
        map.flyTo([lat, lon], 10, { animate: true, duration: 1.5 });
    }
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lon]).addTo(map).bindPopup(`<strong style="color:#0284c7;">${city}</strong><br>Temp: ${Math.round(temp)}°C`).openPopup();
};

const fetchWeatherData = async (cityInputStr) => {
    try {
        if(typeof Swal !== 'undefined') Swal.showLoading();
        let cleanedCity = cityInputStr.replace(/^(مدينة|محافظة|ولاية)\s/g, '').trim();

        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedCity)}&format=json&limit=1&accept-language=en`);
        const geoData = await geoRes.json();
        if (!geoData || geoData.length === 0) throw new Error("City not found");

        const lat = geoData[0].lat;
        const lon = geoData[0].lon;
        const preciseLocation = geoData[0].name;

        const res = await fetch(getExtendedMeteoUrl(lat, lon));
        const meteoData = await res.json();

        const currentWmo = wmoToDescription(meteoData.current.weather_code);
        const currentData = {
            name: preciseLocation,
            coord: { lat, lon },
            main: { temp: meteoData.current.temperature_2m },
            sys: { country: "" },
            weather: [{ id: currentWmo.id, description: currentWmo.desc, icon: currentWmo.icon }]
        };

        localStorage.setItem('lastWeatherData', JSON.stringify(currentData));
        localStorage.setItem('lastMeteoData', JSON.stringify(meteoData));

        updateAllUI(currentData, meteoData);
        if(typeof Swal !== 'undefined') Swal.close();
        return true; 
    } catch (error) {
        if(typeof Swal !== 'undefined') Swal.close();
        if (weatherSounds['error']) weatherSounds['error'].play().catch(()=>{});

        const lastData = JSON.parse(localStorage.getItem('lastWeatherData'));
        const lastMeteo = JSON.parse(localStorage.getItem('lastMeteoData'));

        if (lastData && lastMeteo) {
            updateAllUI(lastData, lastMeteo);
            Swal.fire({ icon: 'warning', title: 'Offline Mode', text: 'Displaying saved data.' });
            return true;
        }
        if(typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Error', text: 'City not found or network issue.' });
        return false;
    }
};

const getUserLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            try {
                if(typeof Swal !== 'undefined') Swal.showLoading();
                const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`);
                const geoData = await geoRes.json();
                let preciseLocation = geoData.length > 0 ? (geoData[0].local_names?.en || geoData[0].name) : "Current Location";

                const res = await fetch(getExtendedMeteoUrl(lat, lon));
                const meteoData = await res.json();

                const currentWmo = wmoToDescription(meteoData.current.weather_code);
                const currentData = {
                    name: preciseLocation,
                    coord: { lat, lon },
                    main: { temp: meteoData.current.temperature_2m },
                    sys: { country: geoData[0]?.country || "" },
                    weather: [{ id: currentWmo.id, description: currentWmo.desc, icon: currentWmo.icon }]
                };
                    
                updateAllUI(currentData, meteoData);
                saveCityToHistory(preciseLocation); 
                if(typeof Swal !== 'undefined') Swal.close();
            } catch (error) {
                if(typeof Swal !== 'undefined') Swal.close();
            }
        });
    }
};

// =========================================================
// 5. Centralized UI Rendering
// =========================================================
const updateAllUI = (currentData, meteoData) => {
    displayCurrentWeather(currentData);
    displayCurrentConditions(meteoData);
    displayForecast(meteoData.daily);
    displayHourlyData(meteoData);
};

const displayCurrentWeather = (data) => {
    if (weatherSounds['success']) weatherSounds['success'].play().catch(()=>{});
    playWeatherSound(data);
    updateBackground(data);
    
    const weatherSection = document.getElementById('current-weather');
    if(!weatherSection) return;
    const iconUrl = getWeatherIcon(data.weather[0].description);
    const locationDisplay = data.sys.country ? `${data.name}, ${data.sys.country}` : data.name;

    weatherSection.innerHTML = `
        <div class="current-weather-card">
            <h2>${locationDisplay}</h2>
            <div class="weather-info">
                <img src="${iconUrl}" alt="Weather">
                <div class="details">
                    <p class="temp">${Math.round(data.main.temp)}°C</p>
                    <p class="desc" style="text-transform: capitalize;">${data.weather[0].description}</p>
                </div>
            </div>
        </div>
    `;
    updateMap(data.coord.lat, data.coord.lon, data.main.temp, data.name);
};

const displayCurrentConditions = (meteoData) => {
    const grid = document.getElementById('conditions-grid');
    if (!grid) return;

    const current = meteoData.current;
    const daily = meteoData.daily;
    const todayIndex = 3; 

    const windSpeed = current.wind_speed_10m || 0;
    const windDir = getWindDirection(current.wind_direction_10m || 0);
    const humidity = current.relative_humidity_2m || 0;
    const pressure = current.surface_pressure || 0;
    const uvIndex = daily.uv_index_max[todayIndex] || 0;
    const sunrise = formatTime(daily.sunrise[todayIndex]);
    const sunset = formatTime(daily.sunset[todayIndex]);

    grid.innerHTML = `
        <div class="condition-card">
            <div class="condition-title">Wind</div>
            <div class="condition-value">${windSpeed} <span class="condition-unit">km/h</span></div>
            <div class="condition-desc">Direction: ${windDir}</div>
        </div>
        <div class="condition-card">
            <div class="condition-title">Humidity</div>
            <div class="condition-value">${humidity} <span class="condition-unit">%</span></div>
            <div class="condition-desc">Dew point mapping normal</div>
        </div>
        <div class="condition-card">
            <div class="condition-title">UV Index</div>
            <div class="condition-value">${uvIndex}</div>
            <div class="condition-desc">Max exposure today</div>
        </div>
        <div class="condition-card">
            <div class="condition-title">Pressure</div>
            <div class="condition-value">${Math.round(pressure)} <span class="condition-unit">mBar</span></div>
            <div class="condition-desc">Surface Level</div>
        </div>
        <div class="condition-card sunrise-sunset-card">
            <div>
                <div class="condition-title">Sunrise</div>
                <div class="condition-value" style="justify-content: center;">${sunrise}</div>
            </div>
            <div>
                <div class="condition-title">Sunset</div>
                <div class="condition-value" style="justify-content: center;">${sunset}</div>
            </div>
        </div>
    `;
};

// =========================================================
// 🟢 Hourly Logic & Tabs (NEW)
// =========================================================
const displayHourlyData = (meteoData) => {
    currentHourlyData = meteoData;
    const nowMs = Date.now();
    // Find closest hour
    currentHourlyIndex = meteoData.hourly.time.findIndex(t => new Date(t).getTime() >= nowMs);
    if(currentHourlyIndex === -1) currentHourlyIndex = 72; // Fallback to today

    renderHourlyForecastRow();
    
    // Attach event listeners to tabs
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
        // Remove old listeners by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            playClickSound();
            renderHourlyTabContent(e.target.getAttribute('data-tab'));
        });
    });

    // Default render
    renderHourlyTabContent('precipitation');
};

const renderHourlyForecastRow = () => {
    const container = document.getElementById('hourly-forecast-container');
    if(!container) return;
    container.innerHTML = '';

    const hourly = currentHourlyData.hourly;
    // Show next 24 hours
    for(let i=0; i<24; i++) {
        let idx = currentHourlyIndex + i;
        if(idx >= hourly.time.length) break;

        let timeStr = new Date(hourly.time[idx]).toLocaleTimeString('en-US', {hour: 'numeric', hour12: true});
        if(i === 0) timeStr = 'Now';

        let temp = Math.round(hourly.temperature_2m[idx]);
        let wmoDesc = wmoToDescription(hourly.weather_code[idx]).desc;
        let icon = getWeatherIcon(wmoDesc);

        container.innerHTML += `
            <div class="hourly-item">
                <span class="temp">${temp}°</span>
                <img src="${icon}" alt="icon">
                <span class="time">${timeStr}</span>
            </div>
        `;
    }
};


// =========================================================
// Daily Forecast Elements
// =========================================================

// =========================================================
// Render Hourly Tabs (Last Card: Past + Future + Scroll Wheel)
// =========================================================
const renderHourlyTabContent = (tabType) => {
    const contentDiv = document.getElementById('hourly-tab-content');
    if(!contentDiv || !currentHourlyData) return;

    const hourly = currentHourlyData.hourly;
    const daily = currentHourlyData.daily;
    const todayIndex = 3;

    let totalText = "";
    let valuesArray = [];
    let unit = "";
    let fillMax = 100;

    if (tabType === 'precipitation') {
        const totalAmount = daily.precipitation_sum[todayIndex] || 0;
        totalText = `<div style="font-size: 0.9rem; color: var(--text-dim);">Today's amount</div><div class="tab-amount">${totalAmount} <span style="font-size:1.2rem;font-weight:400;">mm</span></div>`;
        valuesArray = hourly.precipitation_probability;
        unit = "%";
    } 
    else if (tabType === 'wind') {
        const currentWind = hourly.wind_speed_10m[currentHourlyIndex] || 0;
        totalText = `<div style="font-size: 0.9rem; color: var(--text-dim);">Current speed</div><div class="tab-amount">${currentWind} <span style="font-size:1.2rem;font-weight:400;">km/h</span></div>`;
        valuesArray = hourly.wind_speed_10m;
        unit = " km/h";
        fillMax = 50; 
    }
    else if (tabType === 'humidity') {
        const currentHum = hourly.relative_humidity_2m[currentHourlyIndex] || 0;
        totalText = `<div style="font-size: 0.9rem; color: var(--text-dim);">Current humidity</div><div class="tab-amount">${currentHum} <span style="font-size:1.2rem;font-weight:400;">%</span></div>`;
        valuesArray = hourly.relative_humidity_2m;
        unit = "%";
    }
    else if (tabType === 'sunshine') {
        const uvMax = daily.uv_index_max[todayIndex] || 0;
        totalText = `<div style="font-size: 0.9rem; color: var(--text-dim);">Max UV Index Today</div><div class="tab-amount">${uvMax}</div>`;
        valuesArray = hourly.uv_index;
        unit = " UV";
        fillMax = 11; 
    }

    // 🟢(flex-wrap: nowrap & overflow-x: auto) 🟢
    let rowsHtml = `<div class="tab-row-container" style="display: flex; flex-direction: row; flex-wrap: nowrap; gap: 20px; overflow-x: auto; padding-bottom: 15px; width: 100%; -webkit-overflow-scrolling: touch; scroll-snap-type: x mandatory;">`;
    
    // Pull back 24 hours for the past and 24 hours for the future
    const startIdx = Math.max(0, currentHourlyIndex - 24);
    const endIdx = Math.min(hourly.time.length, currentHourlyIndex + 24);

    for(let idx = startIdx; idx < endIdx; idx++) {
        let isNow = (idx === currentHourlyIndex);
        let timeStr = new Date(hourly.time[idx]).toLocaleTimeString('en-US', {hour: 'numeric', hour12: true});
        if(isNow) timeStr = 'Now';

        let val = Math.round(valuesArray[idx] || 0);
        let percent = Math.min((val / fillMax) * 100, 100);
        
        // Highlight the "Now" hour
        let activeColor = isNow ? 'var(--text-main)' : 'var(--text-dim)';
        let activeWeight = isNow ? 'bold' : 'normal';

        rowsHtml += `
            <div class="tab-row-item" id="${isNow ? 'tab-now-item' : ''}" style="display: flex; flex-direction: column; align-items: center; min-width: 60px; flex: 0 0 auto; scroll-snap-align: center; gap: 8px;">
                <div class="tab-pill" style="width: 40px; height: 10px; border-radius: 5px; background: rgba(255,255,255,0.1); overflow: hidden; position: relative; border: 1px solid var(--glass-border);">
                    <div class="tab-pill-fill" style="height: 100%; background: var(--accent-color); position: absolute; bottom: 0; left: 0; border-radius: 5px; width: ${percent}%;"></div>
                </div>
                <span class="tab-val" style="color: ${activeColor}; font-weight: 600; font-size: 0.95rem;">${val}${unit}</span>
                <span class="tab-time" style="color: ${activeColor}; font-weight: ${activeWeight}; font-size: 0.85rem;">${timeStr}</span>
            </div>
        `;
    }
    rowsHtml += `</div>`;

    contentDiv.innerHTML = totalText + rowsHtml;

    // 🟢 Automatic scrolling to stop at the "Now" clock in the middle 🟢
    setTimeout(() => {
        const nowTab = document.getElementById('tab-now-item');
        if(nowTab) {
            nowTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, 150);
};



const displayForecast = (daily) => {
    const forecastContainer = document.getElementById('forecast-cards');
    const forecastSection = document.querySelector('.forecast-section');
    if (!forecastContainer) return; 

    forecastContainer.innerHTML = ''; 

    const dailyData = daily.time.map((dateStr, index) => {
        return {
            dateStr: dateStr,
            temp_max: daily.temperature_2m_max[index],
            temp_min: daily.temperature_2m_min[index],
            weather: [{ description: wmoToDescription(daily.weather_code[index]).desc }]
        };
    });

    dailyData.forEach(day => {
        const isToday = (new Date().toISOString().split('T')[0] === day.dateStr);
        const dateLabel = isToday ? "Today" : new Date(day.dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const iconUrl = getWeatherIcon(day.weather[0].description);
        
        const card = document.createElement('div');
        card.className = 'weather-card';
        if (isToday) card.style.border = "2px solid var(--accent-color)"; 

        card.innerHTML = `
            <h4>${dateLabel}</h4>
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin: 15px 0;">
                <img src="${iconUrl}" style="width: 50px; height: auto;">
                <span style="font-size: 0.9rem; text-transform: capitalize; color: var(--text-dim); text-align: left;">
                    ${day.weather[0].description}
                </span>
            </div>
            <p><strong>${Math.round(day.temp_max)}°</strong> / ${Math.round(day.temp_min)}°</p>
        `;
        forecastContainer.appendChild(card);
    });

    renderForecastTable(dailyData, forecastSection || forecastContainer.parentElement);
    renderChart(dailyData);
};

const renderForecastTable = (dailyData, container) => {
    if (!container) return; 
    let oldWrapper = container.querySelector('.table-responsive-wrapper');
    if (oldWrapper) oldWrapper.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'table-responsive-wrapper';

    const table = document.createElement('table');
    table.className = 'forecast-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Day</th>
                <th>Date</th>
                <th>Icon</th>
                <th>Condition</th>
                <th>High</th>
                <th>Low</th>
            </tr>
        </thead>
        <tbody>
            ${dailyData.map(day => {
                const isToday = (new Date().toISOString().split('T')[0] === day.dateStr);
                const dayName = isToday ? "Today" : new Date(day.dateStr).toLocaleDateString('en-US', { weekday: 'long' });
                return `
                <tr>
                    <td style="font-weight: bold; color: var(--accent-color);">${dayName}</td>
                    <td>${new Date(day.dateStr).toLocaleDateString('en-US')}</td>
                    <td><img src="${getWeatherIcon(day.weather[0].description)}" style="width: 40px;"></td>
                    <td style="text-transform: capitalize;">${day.weather[0].description}</td>
                    <td>${Math.round(day.temp_max)}°C</td>
                    <td>${Math.round(day.temp_min)}°C</td>
                </tr>`;
            }).join('')}
        </tbody>
    `;
    wrapper.appendChild(table);
    container.insertBefore(wrapper, container.querySelector('.chart-container'));
};

const renderChart = (dailyData) => {
    const ctx = document.getElementById('forecast-chart').getContext('2d');
    if (forecastChartInstance) forecastChartInstance.destroy();

    const isLightMode = document.body.classList.contains('light-mode');
    const textColor = isLightMode ? '#64748b' : '#94a3b8';

    forecastChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyData.map(day => new Date(day.dateStr).toLocaleDateString('en-US', { weekday: 'short' })),
            datasets: [
                {
                    label: 'Max Temp (°C)',
                    data: dailyData.map(day => Math.round(day.temp_max)),
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.2)',
                    borderWidth: 3, tension: 0.4, fill: true
                },
                {
                    label: 'Min Temp (°C)',
                    data: dailyData.map(day => Math.round(day.temp_min)),
                    borderColor: '#94a3b8',
                    borderWidth: 2, borderDash: [5, 5], tension: 0.4
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: textColor } } },
            scales: {
                y: { ticks: { color: textColor } },
                x: { ticks: { color: textColor } }
            }
        }
    });
};

// =========================================================
// 6. Backend Sync & Events
// =========================================================
const saveCityToHistory = async (city) => {
    try {
        const response = await fetch('api/save_city.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `city=${encodeURIComponent(city)}`
        });
        if (response.ok) await updateSidebar(); 
    } catch (err) {}
};

const updateSidebar = async () => {
    try {
        const response = await fetch('api/get_history.php');
        if (!response.ok) return;
        const history = await response.json();
        const sidebar = document.getElementById('saved-cities');
        if (sidebar) {
            sidebar.innerHTML = history.length === 0 
                ? '<p style="color: var(--text-dim); padding: 10px;">No recent searches</p>' 
                : history.map(item => `<div class="saved-city" onclick="playClickSound(); fetchWeatherData('${item.city_name}'); saveCityToHistory('${item.city_name}');">${item.city_name}</div>`).join('');
        }
    } catch (error) {}
};

document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    playClickSound();
    const cityInput = document.getElementById('city-input');
    if (cityInput.value.trim()) {
        const isSuccess = await fetchWeatherData(cityInput.value.trim());
        if (isSuccess) await saveCityToHistory(cityInput.value.trim()); 
        cityInput.value = ''; 
    }
});

const themeToggle = document.getElementById('theme-toggle');
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
    themeToggle.innerHTML = '🌙 Dark Mode';
}

themeToggle.addEventListener('click', () => {
    playClickSound();
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    themeToggle.innerHTML = document.body.classList.contains('light-mode') ? '🌙 Dark Mode' : '☀️ Light Mode';
});

let isAudioUnlocked = false;
document.addEventListener('click', () => {
    if (!isAudioUnlocked) {
        isAudioUnlocked = true; 
        if (currentPlayingSound && currentPlayingSound.paused) currentPlayingSound.play().catch(()=>{});
    }
}, { once: true }); 

const voiceBtn = document.getElementById('voice-search-btn');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; 
    recognition.onstart = () => voiceBtn.classList.add('listening');
    recognition.onresult = (e) => {
        document.getElementById('city-input').value = e.results[0][0].transcript;
        playClickSound();
        document.getElementById('search-form').dispatchEvent(new Event('submit'));
    };
    recognition.onerror = () => voiceBtn.classList.remove('listening');
    recognition.onend = () => voiceBtn.classList.remove('listening');
    voiceBtn.addEventListener('click', () => { playClickSound(); recognition.start(); });
} else {
    voiceBtn.style.display = 'none';
}

window.onload = () => {
    updateSidebar();
    getUserLocation(); 
};

