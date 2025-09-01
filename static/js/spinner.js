    // may wanna change this to show loader
    function showSpinner() {
        const spinner = document.querySelector('.loader');
        if (spinner) {
            spinner.style.display = 'block';
        }
    }
    function hideSpinner() {
        const spinner = document.querySelector('.spinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    }

