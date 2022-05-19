function getCourseBin() {
    fetch("https://webreg.usc.edu/Scheduler/Read", {
        method: 'POST'})
    .then(response => response.json())
    .then(data => console.log(data));
}

function searchDept(dept,term){
    document.getElementById("loading").style.display = "block";
    var url = "https://web-app.usc.edu/web/soc/api/classes/"
    + encodeURIComponent(dept) + "/" + encodeURIComponent(term);
    fetch(url)
    .then(response => response.json())
    .then(data => showSearchedCourses(data.OfferedCourses.course, dept));
}

function addElement(type, className, appendTo, text){
    var element = document.createElement(type);
    if(className != "") {element.className = className;}
    element.appendChild(document.createTextNode(text));
    appendTo.appendChild(element);
    return element;
}

function showSearchedCourses(searchedCourseList, dept){
    console.log(searchedCourseList); //For testing

    //Clear search results
    document.getElementById("searchResultsContainer").innerHTML = "";

    for(let i = 0; i<searchedCourseList.length; i++){
        //Check that the course actually belongs in this search
        //(because USC's API will return all courses connected to a department,
        //even if they don't match the prefix
        //i.e. QBIO-401 will show up when searching for BISC courses
        //Webreg's own search only shows courses that match the prefix exactly)
        if(searchedCourseList[i].CourseData.prefix == dept){
            createClassHTML(searchedCourseList[i],
                document.getElementById("searchResultsContainer"), "search");
        }
    }
    //Hide loading indicator now that search has successfully completed
    document.getElementById("loading").style.display = "none";
}

function createClassHTML(course, addTo, type){
    //Create div for all info for a single course
    var displayCourse = document.createElement("div");
    displayCourse.className = "searchResult";

    //Find how many units the course is worth
    var units = "0.0";
    for(let j = 0; j<course.CourseData.SectionData.length; j++){
        if(parseFloat(course.CourseData.SectionData[j].units) > parseFloat(units)){
            units = course.CourseData.SectionData[j].units;
        }
    }

    //Create button with outer info
    course.courseCode = course.CourseData.prefix + "-" + course.CourseData.number;
    if (typeof course.CourseData.sequence == "string"){
        course.courseCode += course.CourseData.sequence;
    }
    if (typeof course.CourseData.suffix == "string"){
        course.courseCode += " " + course.CourseData.suffix;
    }
    button = addElement("button", "searchResultButton", displayCourse, "");
    addElement("p", "", button, course.courseCode
    + ": " + course.CourseData.title);
    addElement("p", "", button, "Units: " + units);
    
    //Add course info
    var displayCourseInfo = document.createElement("div");
    displayCourseInfo.className = "displayCourseInfo";
    //"Add class" button if in search
    if (type == "search"){
        addClassButton = addElement("button", "addClass", displayCourseInfo,
            "Add class to my list");
        addClassButton.addEventListener('click', function () {
            addClass(course);
        });}
    //Add pre-req and co-req info
    if (typeof course.CourseData.prereq_text == "string"){
        addElement("div", "", displayCourseInfo,
        "Pre-reqs: " + course.CourseData.prereq_text)}
    if (typeof course.CourseData.coreq_text == "string"){
        addElement("div", "", displayCourseInfo,
        "Co-reqs: " + course.CourseData.coreq_text)}
    //Add all course sections to info
    if (Array.isArray(course.CourseData.SectionData)){
        for(let j = 0; j<course.CourseData.SectionData.length; j++){
            createSectionHTML(course.CourseData.SectionData[j], displayCourseInfo,
                type, course.courseCode)}}
        else{
            createSectionHTML(course.CourseData.SectionData, displayCourseInfo,
                type, course.courseCode);
        }
    displayCourse.appendChild(displayCourseInfo);
    //Add the whole course div to the results
    addTo.appendChild(displayCourse);
    //Add accordion dropdown functionality
    button.addEventListener('click', function () {
        toggleShow(this.nextElementSibling);})
}

function createSectionHTML(section, addTo, type, courseCode){
    var sectionDiv = document.createElement("div");
    sectionDiv.className = "searchSection";
    
    addElement("p", "", sectionDiv, section.id + " "
    + section.dclass_code + ": " + section.type);


    var dayText = "";
    if(typeof section.day == "string"){
        var dayParse = section.day;
        while (dayParse != ""){
            var currentDay = dayParse.slice(0,1);
            dayParse = dayParse.slice(1);
            if (currentDay == "T"){
                dayText += "Tu";
            }
            else if (currentDay == "H"){
                dayText += "Th";
            }
            else {
                dayText += currentDay;
            }
        }    
    }
    else{
        dayText = "No days listed, times:";}
    addElement("p", "", sectionDiv, dayText + " "
    + section.start_time + "-" + section.end_time);

    //Check if an instructor is listed, and either display their name or a message
    if (typeof section.instructor != "undefined"){
        if(Array.isArray(section.instructor)){
            for(let k = 0; k<section.instructor.length;k++){
                addElement("p", "", sectionDiv, 
                section.instructor[k].last_name
                + ", " + section.instructor[k].first_name);}
        }
        else{
            addElement("p", "", sectionDiv, 
            section.instructor.last_name
            + ", " + section.instructor.first_name);}}
    else{addElement("p", "", sectionDiv, "No instructor listed");}

    addElement("p", "", sectionDiv, 
    section.number_registered
    + "/" + section.spaces_available);

    //Add "schedule section" button if this is called for myClasses
    if(type == "myClasses"){
        schedSectButton = addElement("button", "schedSect", sectionDiv,
            "Schedule section");
        schedSectButton.addEventListener('click', function () {
            schedSection(section, courseCode);
        });}

    addTo.appendChild(sectionDiv);}

function toggleShow(element){
    if (element.style.display == "block"){
        element.style.display = "none";}
    else {element.style.display = "block";}
}

function addClass(course){
    if(!containsClass(classes, course)) {
        classes.push(course);}
    //Save updated list of classes
    //Using storage.sync currently exceeds QUOTA_BYTES_PER_ITEM but would eventually be ideal
    chrome.storage.local.set({'classes': classes});
    //Show updated list of classes
    showMyClasses();
}

//Clears all classes from the "my classes" section
function clearClasses(){
    classes = [];
    chrome.storage.local.set({'classes': classes});
    showMyClasses();
}

//Displays all saved classes in the "my classes" div of the webpage
function showMyClasses(){
    //Clear classes div
    document.getElementById("myClassesContainer").innerHTML = "";
    for(i=0; i<classes.length; i++){
        createClassHTML(classes[i], document.getElementById("myClassesContainer"), "myClasses");
    }
}

//Returns true if a given array contains the given course
function containsClass(arr, course){
    for(i=0; i<arr.length; i++){
        if(arr[i].PublishedCourseID == course.PublishedCourseID){
            return true;
        }
    }
    return false;
}

//Returns the scheduled section that a given section conflicts with,
//if there is a conflict
function sectionConflicts(calSection){
    var start = calSection.startMinutes + calSection.startHours*60;
    var end = calSection.endMinutes + calSection.endHours*60;
    var ret = [];
    for(i = 0; i<calSections.length; i++){
        var startCheck = calSections[i].startMinutes + calSections[i].startHours*60;
        var endCheck = calSections[i].endMinutes + calSections[i].endHours*60;
        if((start>=startCheck && start<=endCheck)
            || (end>=startCheck && end<=endCheck)){
                for(j = 0; j<calSection.daySections.length; j++){
                    var matches = calSections[i].daySections.filter(
                        e => e.day === calSection.daySections[j].day);
                    if(matches.length > 0){
                        ret.push(matches);
                    }
                }
            }
    }
    return ret;
}

function schedSection(section, coursename){
    var cal = document.getElementById("scrollcal");

    var calSection = {id: section.id, daySections: [],
        startMinutes: parseInt(section.start_time.slice(-2)),
        startHours: parseInt(section.start_time.slice(0, 2)),
        endMinutes: parseInt(section.end_time.slice(-2)),
        endHours: parseInt(section.end_time.slice(0, 2))};

    var day = section.day;
    while (day != ""){
        var currentDay = day.slice(-1);
        day = day.slice(0,-1);
        calSection.daySections.push({day: currentDay});   
    }

    //Checks if the parsed section conflicts with any already scheduled ones
    //If not, creates divs on the calendar for each day of the section
    if(sectionConflicts(calSection).length > 0){
        alert("This section conflicts with an already scheduled section");
    }
    else {
        var unschedButton = [];
        for(i = 0; i<calSection.daySections.length; i++){
            var sectionDiv = addElement("div", "calsection", cal,
            coursename + ": (" + section.id + "), " + section.type);
            sectionDiv.style.position = "absolute";

            unschedButton.push(addElement("button", "", sectionDiv, "X"));

            calSection.daySections[i].sectionDiv = sectionDiv;
        }
        for(i = 0; i<unschedButton.length; i++){
            unschedButton[i].addEventListener('click', function () {
                unSchedSection(calSection);
            });
        }
        setSectionPosition(calSection);
        calSections.push(calSection);
    }
}

//For testing:
function showFirstSection(){
    schedSection(classes[0].CourseData.SectionData[0], classes[0].CourseData.prefix
        + "-" + classes[0].CourseData.number)
}

//Positions given section's calendar div based on its time and day
function setSectionPosition(calSection){
    //Probably inefficient to get every element with this class name every single time
    var calDay = document.getElementsByClassName("cal-day");
    var timeRect = document.getElementsByClassName("cal-time")[1].getBoundingClientRect();
    var headerRect = document.getElementsByClassName("thead")[0].getBoundingClientRect();

    var timeOffset = ((calSection.startHours-5)*2+calSection.startMinutes/30)*7+7;

    for(i = 0; i<calSection.daySections.length; i++){
        var dayOffset = 0;
        if(calSection.daySections[i].day == "M"){
            dayOffset += 1;}
        else if(calSection.daySections[i].day == "T"){
            dayOffset += 2;}
        else if(calSection.daySections[i].day == "W"){
            dayOffset += 3;}
        else if(calSection.daySections[i].day == "H"){
            dayOffset += 4;}
        else if(calSection.daySections[i].day == "F"){
            dayOffset += 5;}
        var cellRect = calDay[timeOffset+dayOffset].getBoundingClientRect();

        var top = cellRect.y - calDay[7+dayOffset].getBoundingClientRect().y
            +headerRect.height;
        var height = cellRect.height/30
            *((calSection.endHours-calSection.startHours)*60
            +calSection.endMinutes-calSection.startMinutes);
        
        calSection.daySections[i].sectionDiv.style.top =
            top.toString() + "px";
        calSection.daySections[i].sectionDiv.style.height =
            height.toString() + "px";

        calSection.daySections[i].sectionDiv.style.left = 
            (cellRect.x - timeRect.x).toString() + "px";
        calSection.daySections[i].sectionDiv.style.width = 
            (0.95*cellRect.width).toString() + "px";
    }
}

function unSchedSection(calSection){
    var index = calSections.indexOf(calSection)
    for(j = 0; j<calSections[index].daySections.length; j++){
        calSections[index].daySections[j].sectionDiv.remove();
    }
    calSections.splice(index, 1);
}

function setAllSectionPositions(){
    for(x = 0; x<calSections.length; x++){
        setSectionPosition(calSections[x]);
    }
}

//Listen for changes in webpage zoom, update calendar div positions if needed
function monitorDevicePixelRatio() {
    function onPixelRatioChange() {
        setAllSectionPositions();
        monitorDevicePixelRatio();
    }
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    .addEventListener("change", onPixelRatioChange, { once: true });
}
monitorDevicePixelRatio();

//Update calendar div positions on window resize
window.addEventListener("resize", setAllSectionPositions);

chrome.storage.local.set({'term': "20223"})
var term;
var classes;
chrome.storage.local.get(['term','classes'], data => {
    term = data.term;
    if (typeof data.classes != "undefined"){classes = data.classes}
    else{classes = []}
    showMyClasses();
});

//Adds search listener to dept search box
var input = document.getElementById("input");
input.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        searchDept(event.target.value.toUpperCase(),term);
    }
});

var calSections = [];