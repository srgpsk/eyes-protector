const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('context', {
    sendSettings: message => ipcRenderer.on('sendSettings', message),
    setNextBreak: timeToNextBreakInMs => ipcRenderer.invoke('setNextBreak', timeToNextBreakInMs),
    countdown: (totalDurationInMs, callback) => {
        const timerId = setInterval(() => {
            callback(totalDurationInMs)

            if (0 >= totalDurationInMs) clearInterval(timerId)
            totalDurationInMs -= 1000;
        }, 1000)
    },
})

// All the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency])
    }
})