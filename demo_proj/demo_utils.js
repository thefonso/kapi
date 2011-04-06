(function () {
	if (!window._demoApp) {
		window._demoApp = {};
	}
	
	window._demoApp.utils = {
		'degToRad': function degToRad (deg) {
			return (deg / 180) * Math.PI;
		},
		
		'revsPerSecond': function revsPerSecond (seconds) {
			return '-=' + window._demoApp.utils.degToRad(seconds * 40);
		}
	};
	
}())