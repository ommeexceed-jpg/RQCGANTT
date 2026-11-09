module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', '@angular-devkit/build-angular'],
        plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-jasmine-html-reporter'),
            require('@angular-devkit/build-angular/plugins/karma')
        ],
        client: {
            jasmine: { random: false },
            clearContext: false
        },
        reporters: ['progress', 'kjhtml'],
        browsers: ['ChromeHeadlessCI'],
        restartOnFileChange: true,
        customLaunchers: {
            ChromeHeadlessCI: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox']
            }
        }
    });
};
