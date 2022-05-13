// class course {
//     constructor(dept, number, title){
//         this.dept = dept;
//         this.number = number;
//         this.title = title;
//         //this.units = units;
//         this.sections = [];
//     }
// }

// class section {
//     constructor(id, day, start_time, end_time, numRegistered, spaces, type){
//         this.id = id;
//         this.day = day;
//         this.start_time = start_time;
//         this.end_time = end_time;
//         this.numRegistered = numRegistered;
//         this.spaces = spaces;
//         this.type = type;
//     }
// }

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
        //Check that the course actually belongs in this search (because USC's API will return all courses connected to a department even if they don't match the prefix, i.e. QBIO-401 will show up when searching for BISC courses. Webreg's own search only shows courses that match the prefix exactly)
        if(searchedCourseList[i].CourseData.prefix == dept){
            createClassHTML(searchedCourseList[i], document.getElementById("searchResultsContainer"), "search");
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
    button = addElement("button", "searchResultButton", displayCourse, "");
    addElement("p", "", button, 
    course.CourseData.prefix
    + "-" + course.CourseData.number
    + ": " + course.CourseData.title);
    addElement("p", "", button, "Units: " + units);
    
    //Add course info
    var displayCourseInfo = document.createElement("div");
    displayCourseInfo.className = "displayCourseInfo";
    //"Add class" button if in search
    if (type == "search"){
        addClassButton = addElement("button", "addClass", displayCourseInfo, "Add class to my list");
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
            createSectionHTML(course.CourseData.SectionData[j], displayCourseInfo)}}
        else{
            createSectionHTML(course.CourseData.SectionData, displayCourseInfo);
        }
    displayCourse.appendChild(displayCourseInfo);
    //Add the whole course div to the results
    addTo.appendChild(displayCourse);
    //Add accordion dropdown functionality
    button.addEventListener('click', function () {
        toggleShow(this.nextElementSibling);})
}

function createSectionHTML(section, addTo){
    var sectionDiv = document.createElement("div");
    sectionDiv.className = "searchSection";
    
    addElement("p", "", sectionDiv, section.id + " "
    + section.dclass_code + ": " + section.type);

    if(typeof section.day == "string"){
        addElement("p", "", sectionDiv, section.day + " "
        + section.start_time + "-" + section.end_time);}
    else{
        addElement("p", "", sectionDiv, "No days listed, times: "
        + section.start_time + "-" + section.end_time);}

    //Check if an instructor is listed for the course, and either display their name or a message
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

    addTo.appendChild(sectionDiv);}

function toggleShow(element){
    if (element.style.display == "block"){
        element.style.display = "none";}
    else {element.style.display = "block";}
}

function addClass(course){
    if(!containsClass(classes, course)) {
        classes.push(course);}
    //Save updated list of classes - using storage.sync currently exceeds QUOTA_BYTES_PER_ITEM but would eventually be ideal
    chrome.storage.local.set({'classes': classes});
    //Show updated list of classes
    showMyClasses();
}

function clearClasses(){
    classes = [];
    chrome.storage.local.set({'classes': classes});
    showMyClasses();
}

function showMyClasses(){
    //Clear classes div
    document.getElementById("myClassesContainer").innerHTML = "";
    for(i=0; i<classes.length; i++){
        createClassHTML(classes[i], document.getElementById("myClassesContainer"), "myClasses");
    }
}

function containsClass(obj, course){
    for(i=0; i<obj.length; i++){
        if(obj[i].PublishedCourseID == course.PublishedCourseID){
            return true;
        }
    }
    return false;
}

function showSection(section, coursename){
    var cal = document.getElementById("scrollcal");

    var calSection = {id: section.id, daySections: [], start_time: section.start_time, end_time: section.end_time};

    var day = section.day;
    while (day != ""){
        var currentDay = day.slice(-1);
        day = day.slice(0,-1);
        if (currentDay == "H"){
            currentDay = "TH";
            day = day.slice(0,-1);
        }

        var sectionDiv = addElement("div", "calsection", cal,
        coursename + ": (" + section.id + ")");
        sectionDiv.style.position = "absolute";

        sectionDiv.style.background = "blue";

        calSection.daySections.push({sectionDiv: sectionDiv, day: currentDay})        
    }

    setSectionPosition(calSection);
    calSections.push(calSection);
}

//For testing:
function showFirstSection(){
    showSection(classes[0].CourseData.SectionData[0], classes[0].CourseData.prefix
        + "-" + classes[0].CourseData.number)
}

function setSectionPosition(calSection){
    //Probably inefficient to get every element with this class name every single time
    var calDay = document.getElementsByClassName("cal-day");
    var timeRect = document.getElementsByClassName("cal-time")[1].getBoundingClientRect();
    var headerRect = document.getElementsByClassName("thead")[0].getBoundingClientRect();

    var startMinutes = parseInt(calSection.start_time.slice(-2));
    var startHours = parseInt(calSection.start_time.slice(0, 2));
    var endMinutes = parseInt(calSection.end_time.slice(-2));
    var endHours = parseInt(calSection.end_time.slice(0, 2));
    var timeOffset = ((startHours-5)*2+startMinutes/30)*7+7;

    for(i = 0; i<calSection.daySections.length; i++){
        var dayOffset = 0;
        if(calSection.daySections[i].day == "M"){
            dayOffset += 1;}
        else if(calSection.daySections[i].day == "T"){
            dayOffset += 2;}
        else if(calSection.daySections[i].day == "W"){
            dayOffset += 3;}
        else if(calSection.daySections[i].day == "TH"){
            dayOffset += 4;}
        else if(calSection.daySections[i].day == "F"){
            dayOffset += 5;}
        var cellRect = calDay[timeOffset+dayOffset].getBoundingClientRect();

        var top = cellRect.y - calDay[7+dayOffset].getBoundingClientRect().y+headerRect.height;
        var height = cellRect.height/30*((endHours-startHours)*60+endMinutes-startMinutes);
        
        calSection.daySections[i].sectionDiv.style.top = top.toString() + "px";
        calSection.daySections[i].sectionDiv.style.height = height.toString() + "px";

        calSection.daySections[i].sectionDiv.style.left = (cellRect.x - timeRect.x).toString() + "px";
        calSection.daySections[i].sectionDiv.style.width = cellRect.width.toString() + "px";
    }
}

function monitorDevicePixelRatio() {
    function onPixelRatioChange() {
      for(i = 0; i<calSections.length; i++){
          setSectionPosition(calSections[i]);
      }
      monitorDevicePixelRatio();
    }
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    .addEventListener("change", onPixelRatioChange, { once: true });
  }
  monitorDevicePixelRatio();

//chrome.storage.local.set({'term': "20223"})
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