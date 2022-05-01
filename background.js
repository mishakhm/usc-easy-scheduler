chrome.action.onClicked.addListener(function () {
        chrome.tabs.create({ url: chrome.runtime.getURL("calendar.html") });
        //getCourseBin();
        //searchDept("BISC","20223");
    });
/*
function getCourseBin() {
    fetch("https://webreg.usc.edu/Scheduler/Read", {
        method: 'POST'})
    .then(response => response.json())
    .then(data => console.log(data));
}

function searchDept(dept,term){
    var url = "https://web-app.usc.edu/web/soc/api/classes/"
    + encodeURIComponent(dept)
    + "/"
    + encodeURIComponent(term);
    fetch(url)
    .then(response => response.json())
    .then(data => console.log(data));
    
}
*/