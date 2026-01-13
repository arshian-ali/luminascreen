/**
 * White Screen Tool Logic
 */

/* --- State --- */
const state = {
    color: '#FFFFFF',
    brightness: 100, // percentage
    kelvin: 6500,
    isFullscreen: false,
    activeTab: 'presets'
};

/* --- DOM Elements --- */
const lightSource = document.getElementById('light-source');
const uiContainer = document.querySelector('.ui-container');
const controlDock = document.querySelector('.control-dock');
const tabs = document.querySelectorAll('.nav-btn[data-tab]');
const tabPanes = document.querySelectorAll('.tab-pane');
const swatches = document.querySelectorAll('.color-swatch');

// Inputs
const nativePicker = document.getElementById('native-picker');
const hexDisplay = document.getElementById('hex-display');
const rgbInputs = {
    r: document.getElementById('input-r'),
    g: document.getElementById('input-g'),
    b: document.getElementById('input-b')
};
const kelvinSlider = document.getElementById('kelvin-slider');
const kelvinVal = document.getElementById('kelvin-val');
const brightnessSlider = document.getElementById('brightness-slider');
const brightnessVal = document.getElementById('brightness-val');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnDownload = document.getElementById('btn-download');

/* --- Initialization --- */
function init() {
    updateUI();
    setupEventListeners();
    setupIdleTimer();
    updateResolutionDisplay();
    window.addEventListener('resize', updateResolutionDisplay);
}


/* --- Core Functions --- */

function setColor(color) {
    state.color = color;
    lightSource.style.setProperty('--bg-color', color);
    
    // Update inputs to match
    if (color.startsWith('#')) {
        nativePicker.value = color;
        hexDisplay.innerText = color.toUpperCase();
        
        const rgb = hexToRgb(color);
        if (rgb) {
            rgbInputs.r.value = rgb.r;
            rgbInputs.g.value = rgb.g;
            rgbInputs.b.value = rgb.b;
        }
    } else if (color.startsWith('rgb')) {
        // Parse rgb string later if needed, mostly we use hex internally for state
    }
}

function setBrightness(percent) {
    state.brightness = percent;
    // Map 0-100 to 0.0-1.0
    const val = percent / 100;
    lightSource.style.setProperty('--brightness', val);
    brightnessVal.innerText = `${percent}%`;
}

function setKelvin(k) {
    state.kelvin = k;
    kelvinVal.innerText = `${k}K`;
    
    const rgb = kelvinToRgb(k);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setColor(hex);
}


/* --- Helpers --- */

// Algorithm to convert Kelvin to RGB
// Source based on Tanner Helland's algorithm
function kelvinToRgb(kelvin) {
    let temp = kelvin / 100;
    let r, g, b;

    if (temp <= 66) {
        r = 255;
        g = temp;
        g = 99.4708025861 * Math.log(g) - 161.1195681661;
        
        if (temp <= 19) {
            b = 0;
        } else {
            b = temp - 10;
            b = 138.5177312231 * Math.log(b) - 305.0447927307;
        }
    } else {
        r = temp - 60;
        r = 329.698727446 * Math.pow(r, -0.1332047592);
        
        g = temp - 60;
        g = 288.1221695283 * Math.pow(g, -0.0755148492);
        
        b = 255;
    }

    return {
        r: clamp(r, 0, 255),
        g: clamp(g, 0, 255),
        b: clamp(b, 0, 255)
    };
}

function clamp(x, min, max) {
    if (x < min) return min;
    if (x > max) return max;
    return Math.round(x);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}


/* --- Event Listeners --- */

function setupEventListeners() {
    
    // Tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById(`tab-${target}`).classList.add('active');
            state.activeTab = target;
        });
    });

    // Swatches
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const color = swatch.getAttribute('data-color');
            setColor(color);
        });
    });

    // Custom Color Picker
    nativePicker.addEventListener('input', (e) => {
        setColor(e.target.value);
    });

    // RGB Inputs
    const updateFromRgb = () => {
        const r = parseInt(rgbInputs.r.value) || 0;
        const g = parseInt(rgbInputs.g.value) || 0;
        const b = parseInt(rgbInputs.b.value) || 0;
        const hex = rgbToHex(clamp(r,0,255), clamp(g,0,255), clamp(b,0,255));
        setColor(hex);
    };
    rgbInputs.r.addEventListener('input', updateFromRgb);
    rgbInputs.g.addEventListener('input', updateFromRgb);
    rgbInputs.b.addEventListener('input', updateFromRgb);

    // Kelvin
    kelvinSlider.addEventListener('input', (e) => {
        setKelvin(e.target.value);
    });

    // Brightness
    brightnessSlider.addEventListener('input', (e) => {
        setBrightness(e.target.value);
    });

    // Full Screen
    btnFullscreen.addEventListener('click', toggleFullscreen);

    // Download
    btnDownload.addEventListener('click', downloadImage);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((e) => {
            console.error(e);
        });
        document.body.classList.add('fullscreen');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        document.body.classList.remove('fullscreen');
    }
}

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        document.body.classList.remove('fullscreen');
    }
});


// Idle Timer to hide UI
let idleTimer;
function setupIdleTimer() {
    const resetTimer = () => {
        document.body.classList.remove('ui-hidden');
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            // Only hide in full screen or if user hasn't interacted? 
            // The original site hides specific elements. Let's hide menu if not hovering it.
            // Actually, keep it simple: hide UI after 3s of no mouse movement
            document.body.classList.add('ui-hidden');
        }, 3000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();
}

function updateResolutionDisplay() {
    const w = window.screen.width;
    const h = window.screen.height;
    const el = document.getElementById('res-display');
    if (el) el.innerText = `${w} x ${h}`;
}


function downloadImage() {
    const canvas = document.createElement('canvas');
    const width = window.screen.width;
    const height = window.screen.height;
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    
    // Fill color
    ctx.fillStyle = state.color;
    ctx.fillRect(0, 0, width, height);
    
    // Apply brightness (simulate with black overlay opacity)
    // brightness 100% = 0 alpha, 0% = 1 alpha
    const opacity = 1 - (state.brightness / 100);
    if (opacity > 0) {
        ctx.fillStyle = `rgba(0,0,0,${opacity})`;
        ctx.fillRect(0, 0, width, height);
    }
    
    // Download
    const link = document.createElement('a');
    link.download = `whitescreen-${state.color.replace('#','')}-${width}x${height}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function updateUI() {
    // Set initial brightness
    setBrightness(100);
}


init();
