// load the page
window.addEventListener('DOMContentLoaded',function () {
    const term = new Terminal({cursorBlink: true});
    // find the div where we put the terminal
    const container = document.getElementById('terminal');
    //load the terminal into the div
    term.open(container);
    term.writeln('welcome');
    term.write('\r\n$ ');

    // store what user types
    let line = '';
    //everytime user press key inside terminal
    term.onData((data) => {
        //if ENTER key
        if (data === '\r'){
            let input = line.trim();

            term.write(`\r\nYou typed: ${line}\r\n$`)
            // clear the line buffer so next command empty
            line = '';
        }
        //if DEL key
        if (data === '\u007F') {
            if (line.length > 0) {
                //drop the last char from saved text
                line = line.slice(0, -1)
                term.write('\b \b')
            }
        }
        //accept printable chars
        const code = data.charCodeAt(0);
        const printChar = code >= 0x20 && code <= 0x7E;

        if (printChar){
            line += data;
            term.write(data);
        }
    });
});