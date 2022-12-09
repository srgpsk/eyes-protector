/* ------------- SETTINGS ------------ */

const settingsWindowWidth = 300
const settingsWindowHeight = 500
const windows10BottomToolbarHeight = 40
const pomodoroDurationInMinutes = 45
const addMoreTimeDurationInMinutes = 0.5
const breakDurationInMinutes = 10

/* ------------- APP ----------------- */

const { app, screen, ipcMain, powerMonitor, nativeImage, BrowserWindow, Menu, Tray } = require('electron')
const path = require('path')
try {
    require('electron-reloader')(module)
} catch (_) {
    console.log(_)
}

// let secondsLeftToTheNextBreak = pomodoroDurationInMinutes * 60
let nextBreakTimestampInMs = null
let workingSessionTimeoutId = null
let tray = null

const lockAllDisplays = () => {
    for (display of screen.getAllDisplays()) {
        const { x, y } = display.bounds
        createLockerWindow({ x, y })
    }
}

const sendSettingsToLockerWindow = lockerWindow => {
    const settings = {
        breakDurationInMs: convertMinToMs(breakDurationInMinutes),
        addMoreTimeDurationInMs: convertMinToMs(addMoreTimeDurationInMinutes)
    }
    lockerWindow.webContents.send('sendSettings', settings)
}

const getNextBreakTimestamp = msToNextBreak => {
    const dt = new Date
    return dt.setMilliseconds(dt.getMilliseconds() + msToNextBreak)
}

const setupNextBreak = msToNextBreak => {
    msToNextBreak ??= getBreakDefaultDurationInMs()
    nextBreakTimestampInMs = getNextBreakTimestamp(msToNextBreak)
    workingSessionTimeoutId = setTimeout(() => lockAllDisplays(), msToNextBreak)
}

const stopTheCycle = () => {
    nextBreakTimestampInMs = null
    if (workingSessionTimeoutId) clearTimeout(workingSessionTimeoutId)
}

const getBreakDefaultDurationInMs = () => convertMinToMs(pomodoroDurationInMinutes)

const convertMinToMs = timeInMinutes => timeInMinutes * 60 * 1000

const closeAllWindows = () => BrowserWindow.getAllWindows().map(window => window.close())

const formatTime = timeInMs => {
    const date = new Date(timeInMs);
    const minutes = date.getUTCMinutes();
    const seconds = date.getSeconds();

    return minutes.toString().padStart(2, '0') + 'm ' + seconds.toString().padStart(2, '0') + 's'
}

const createLockerWindow = async (options) => {
    const defaultOptions = {
        transparent: true,
        frame: false,
        skipTaskbar: true,
        fullscreen: true,
        alwaysOnTop: true,
        movable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
        }
    }
    const window = new BrowserWindow({ ...options, ...defaultOptions })

    await window.loadFile('locker.html')
    sendSettingsToLockerWindow(window);

    // Open the DevTools.
    // window.webContents.openDevTools()
}

const createSettingsWindow = () => {
    const display = screen.getPrimaryDisplay()
    const { width: displayWidth, height: displayHeight } = display.bounds;

    const window = new BrowserWindow({
        width: settingsWindowWidth,
        height: settingsWindowHeight,
        x: displayWidth - settingsWindowWidth * 2,
        y: displayHeight - settingsWindowHeight - windows10BottomToolbarHeight,
        transparent: false,
        skipTaskbar: true,
        frame: true,
        resizable: true,
        fullscreenable: false,

        visibleOnAllWorkspaces: true,

        webPreferences: {
            // preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
        }
    })

    window.loadFile('settings.html')
}


function createTray() {
    const icon = path.join(__dirname, '/logo.ico')
    const trayicon = nativeImage.createFromPath(icon).resize({ width: 16 })
    tray = new Tray(trayicon)

    const contextMenu = Menu.buildFromTemplate([
        {
            enabled: false, // TODO implement it
            label: 'Settings',
            click: () => {
                createSettingsWindow()
            }
        },
        {
            label: 'Take a break',
            click: () => {
                lockAllDisplays()
                setupNextBreak()
            }
        },
        {
            label: 'Exit',
            click: () => {
                app.quit()
            }
        },
    ])
    tray.setContextMenu(contextMenu)

}

const setTrayListeners = async () => {
    // shows meta info on hover
    tray.addListener('mouse-move', () => tray.setToolTip(`Time to next break: ${formatTime(nextBreakTimestampInMs - Date.now())}\nIt starts at:  ${(new Date(nextBreakTimestampInMs)).toLocaleTimeString()}`))

}

const setPowerMonitorListeners = async () => {
    powerMonitor.addListener('lock-screen', () => stopTheCycle());
    powerMonitor.addListener('unlock-screen', () => setupNextBreak());
}

const setInterProcessMessaging = async () => {
    ipcMain.handle('setNextBreak', (event, msToNextBreak) => {
        closeAllWindows()
        setupNextBreak(msToNextBreak)
    })
}

const setListeners = () => {
    setInterProcessMessaging()
    setTrayListeners()
    setPowerMonitorListeners()
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    // if tray hasn't been created already.
    if (!tray) {
        createTray()
    }

    setListeners()

    // start pomodoro cycle
    setupNextBreak()

    // app.on('activate', () => {
    //     // On macOS it's common to re-create a window in the app when the
    //     // dock icon is clicked and there are no other windows open.
    //     if (BrowserWindow.getAllWindows().length === 0) createLockerWindow()
    // })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    // if (process.platform !== 'darwin') app.quit() OR  app.dock.hide()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

