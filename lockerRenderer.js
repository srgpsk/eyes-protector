const setTimer = async breakDurationInMs => {
    await window.context.countdown(
        breakDurationInMs,
        timeLeft => {
            if (0 >= timeLeft) window.context.setNextBreak()
            document.getElementById('timer').innerText = formatTime(timeLeft)
        })
}

const setAddMoreTimeBtnDurationText = miliseconds => {
    document.querySelector('#add_more_time span').innerHTML = formatTime(miliseconds) + ' ' + getTimeWord(miliseconds)
}

const setListeners = settings => {
    document.getElementById('skip').addEventListener('click', () => window.context.setNextBreak(), false);
    document.getElementById('add_more_time').addEventListener('click', () => window.context.setNextBreak(settings.addMoreTimeDurationInMs), false);
}

const getTimeWord = miliseconds => {
    // all in miliseconds
    const hour = 60 * 60 * 1000
    const minute = 60 * 1000
    return miliseconds > hour ? 'hour' : (miliseconds > minute ? 'min' : 'sec')
}

const formatTime = miliseconds => {
    const date = new Date(miliseconds);
    const minutes = date.getUTCMinutes();
    const seconds = date.getSeconds();

    return minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0')
}

window.context.sendSettings((event, settings) => {
    setAddMoreTimeBtnDurationText(settings.addMoreTimeDurationInMs)
    setTimer(settings.breakDurationInMs)
    setListeners(settings)
});


