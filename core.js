class Course {
  constructor(CourseData) {
    this.prefix = CourseData.prefix;
    this.number = CourseData.number;
    this.sequence = CourseData.sequence;
    this.code = this.prefix + '-' + this.number;
    if (typeof this.sequence == 'string') {
      this.code += this.sequence;
    }
    this.suffix = CourseData.suffix;
    this.title = CourseData.title;
    this.prereq_text = CourseData.prereq_text;
    this.coreq_text = CourseData.coreq_text;
    this.units = '0.0';
    this.sectionTypes = [];
    this.SectionData = [];
    if (Array.isArray(CourseData.SectionData)) {
      for (let i = 0; i<CourseData.SectionData.length; i++) {
        // Find how many units the course is worth
        // because only one section will have the number of units
        if (parseFloat(CourseData.SectionData[i].units) >
          parseFloat(this.units)) {
          this.units = CourseData.SectionData[i].units;
        }
        // Grab all sections, as Section class objects
        this.SectionData.push(
            new Section(CourseData.SectionData[i], this.code, this.prefix));
        this.SectionData[i].parent = this;
        // If this section type hasn't been encountered yet,
        // add it to the array
        if (this.sectionTypes.filter((e) =>
          e.type == this.SectionData[i].type).length==0) {
          this.sectionTypes.push({type: this.SectionData[i].type});
        }
      }
    // USC doesn't use an array if a class only has one section
    } else {
      this.units = CourseData.SectionData.units;
      this.SectionData.push(
          new Section(CourseData.SectionData, this.code, this.prefix));
      this.SectionData[0].parent = this;
      this.sectionTypes.push({type: this.SectionData[0].type});
    }
    // If displayOrders already exist from the object being used for the
    // constructor (if importing from stored myClasses), use it
    for (let i = 0; i<this.sectionTypes.length; i++) {
      this.sectionTypes[i].displayOrder = [];
      if (Array.isArray(CourseData.sectionTypes)) {
        const existingType = CourseData.sectionTypes.filter((e) =>
          e.type == this.sectionTypes[i].type)[0];
        for (let j = 0; j<existingType.displayOrder.length; j++) {
          // Find matching section within this Course object
          // and push pointer to it
          this.sectionTypes[i].displayOrder.push(
              this.SectionData.filter((e) =>
                e.id == existingType.displayOrder[j].id)[0]);
        }
      }
      // else{
      //     this.sectionTypes[i].displayOrder = [];
      // }
      // Add any missing sections that match the type to the displayOrder
      for (let j = 0; j<this.SectionData.length; j++) {
        if (this.SectionData[j].type ==
                    this.sectionTypes[i].type &&
                        this.sectionTypes[i].displayOrder.filter((e) =>
                          e.id == this.SectionData[j].id).length == 0) {
          this.sectionTypes[i].displayOrder.push(
              this.SectionData[j],
          );
        }
      }
    }
  }
  createHTML(addTo, type) {
    // Create div for all info for a single course
    this.classDiv = document.createElement('div');
    this.classDiv.className = 'searchResult';

    // Create div with outer info
    let text = this.code;
    if (typeof this.suffix == 'string') {
      text += ' ' + this.suffix;
    }
    const outer = addElement('div', 'searchResultOuter', this.classDiv, '');
    addElement('p', 'searchResultTitle', outer, text + ': ' + this.title);
    addElement('p', 'searchResultUnits', outer, 'Units: ' + this.units);
    addElement('i', 'dropIcon fa-solid fa-chevron-down', outer, '');

    // Add course info
    const displayCourseInfo = document.createElement('div');
    displayCourseInfo.className = 'displayCourseInfo';

    // "Add class" icon if in search
    if (type == 'search') {
      const addClassButton = addElement('i', 'fa-solid', outer,
          '');
      // If the class is already in myClasses, display the
      // checkmark instead of the plus already
      if (containsClass(classes, this.code)==-1) {
        addClassButton.classList.add('fa-plus');
      } else {
        addClassButton.classList.add('fa-check');
      }
      addClassButton.addEventListener('click', (e) => {
        // If class isn't added, add it. If it already has been
        // and checkmark is displayed, remove it
        if (addClassButton.classList.contains('fa-plus')) {
          this.add();
        } else {
          // Find the matching course in classes array and remove it
          // (using remove.this() can cause unexpected behavior due
          // to the search result being its own object)
          classes[classes.findIndex((course) =>
            course.code == this.code)].remove();
        }
        // Change between plus icon and checkmark
        addClassButton.classList.toggle('fa-plus');
        addClassButton.classList.toggle('fa-check');
        // Stop this click from also triggering accordion dropdown
        e.stopPropagation();
      });

    // "Remove from my classes" button if in myClasses
    } else if (type == 'myClasses') {
      const removeClassButton = addElement('i', 'fa-solid fa-xmark', outer,
          '');
      removeClassButton.addEventListener('click', (e) => {
        this.remove();
        e.stopPropagation();
      });
    }

    // Add pre-req and co-req info
    let extraInfo;
    if (typeof this.prereq_text == 'string') {
      extraInfo = addElement('div', 'extraInfo', displayCourseInfo, '');
      addElement('p', '', extraInfo,
          'Pre-reqs: ' + this.prereq_text);
    }
    if (typeof this.coreq_text == 'string') {
      if (typeof extraInfo == 'undefined') {
        extraInfo = addElement('div', 'extraInfo',
            displayCourseInfo, '');
      }
      addElement('p', '', extraInfo,
          'Co-reqs: ' + this.coreq_text);
    }

    // Create divs for each section type
    for (let i = 0; i<this.sectionTypes.length; i++) {
      const typeDiv = addElement('div', 'searchResultType',
          displayCourseInfo, '');

      const typeDivOuter = addElement('div', 'searchResultTypeOuter',
          typeDiv, '');

      const sectionTypeTitle = addElement('p', '', typeDivOuter, '');
      // Show number currently scheduled out of total if in myClasses,
      // otherwise just show total matching sections
      if (type == 'myClasses') {
        // Written as function so this.scheduled() and this.unscheduled()
        // can call it to update
        this.sectionTypes[i].setDivTitle = () => {
          sectionTypeTitle.innerHTML = this.sectionTypes[i].type +
                        ' (' + this.sectionTypes[i].displayOrder.filter((e) =>
            e.scheduled).length + '/' +
                                this.sectionTypes[i].displayOrder.length + ')';
        };
        this.sectionTypes[i].setDivTitle();

      // Don't attempt to show number currently scheduled if in search
      } else if (type == 'search') {
        sectionTypeTitle.innerHTML = this.sectionTypes[i].type + ' (' +
                    this.sectionTypes[i].displayOrder.length + ')';
      }

      // Add CSS class to div based on which type it's for (to color)
      if (this.sectionTypes[i].type.includes('Lec')) {
        typeDiv.classList.add('typeLec');
      } else if (this.sectionTypes[i].type.includes('Lab')) {
        typeDiv.classList.add('typeLab');
      } else if (this.sectionTypes[i].type.includes('Qz')) {
        typeDiv.classList.add('typeQz');
      } else if (this.sectionTypes[i].type.includes('Dis') &&
                !this.sectionTypes[i].type.includes('Lec')) {
        typeDiv.classList.add('typeDis');
      }

      const typeDivContent = addElement(
          'div', 'searchResultTypeContent', typeDiv, '');
      typeDivContent.style.display = 'none';

      addElement('i', 'dropIcon fa-solid fa-chevron-down',
          typeDivOuter, '');
      // Add accordion dropdown functionality
      typeDivOuter.addEventListener('click', accordion);

      // Add section filtering search bar if there are 7 or more sections
      if (this.sectionTypes[i].displayOrder.length >= 7) {
        const filterDiv = addElement('div', 'filterDiv', typeDivContent, '');
        const filterBar = addElement('input', '', filterDiv, '');
        filterBar.placeholder = 'Filter sections';

        filterBar.addEventListener('keyup',
            function(event) {
              const input = event.target.value.toUpperCase();
              const divs = event.target.parentNode.parentNode.children;
              for (let j = 0; j<divs.length; j++) {
                if (divs[j].classList.contains('searchSection')) {
                  const textValue = divs[j].textContent || divs[j].innerText;
                  if (textValue.toUpperCase().includes(input)) {
                    divs[j].style.display = '';
                  } else {
                    divs[j].style.display = 'none';
                  }
                }
              }
            },
        );
      }

      // Add all sections of this type according to their displayOrder
      for (let k = 0; k<this.sectionTypes[i].displayOrder.length; k++) {
        this.sectionTypes[i].displayOrder[k].createHTML(typeDivContent, type);
      }

      this.sectionTypes[i].outerDiv = typeDivOuter;
      this.sectionTypes[i].innerDiv = typeDivContent;
    }
    this.classDiv.appendChild(displayCourseInfo);
    // Add the whole course div to the results
    addTo.appendChild(this.classDiv);

    // Add accordion dropdown functionality
    outer.addEventListener('click', accordion);
    outer.addEventListener('click', function() {
      if (outer.style.borderBottom == '') {
        outer.style.borderBottom = '1px dashed gray';
      } else {
        outer.style.borderBottom = '';
      }
    });
  }
  // Adds the given class to myClasses if it is not already in it
  add() {
    if (containsClass(classes, this.code)==-1) {
      const index = classes.push(this);
      // Save updated list of classes
      saveMyClasses();
      // Add the HTML for the newly added class to myClasses div
      classes[index-1].createHTML(
          document.getElementById('myClassesContainer'), 'myClasses');
      // Cross out "add section button" for conflicting sections
      crossOutConflicts();
    }
  }
  // Removes the given class from myClasses
  remove() {
    // Unschedules all scheduled sections of this class
    for (let i=0; i<this.SectionData.length; i++) {
      if (this.SectionData[i].scheduled) {
        this.SectionData[i].unschedule();
      }
    }
    // Removes this class HTML div from myClasses
    this.classDiv.remove();
    // Removes this class from classes array
    classes.splice(classes.findIndex((e) => e == this), 1);
    // Save updated list of classes
    saveMyClasses();
  }
}

class Section {
  constructor(SectionData, code, prefix) {
    this.code = code;
    this.prefix = prefix;
    this.id = SectionData.id;
    this.instructor = SectionData.instructor;
    this.profList = '';
    if (typeof this.instructor != 'undefined') {
      if (Array.isArray(this.instructor)) {
        for (let i = 0; i<this.instructor.length; i++) {
          this.profList += this.instructor[i].first_name + ' ' +
                    this.instructor[i].last_name;
          if (i != this.instructor.length-1) {
            this.profList += ', ';
          }
        }
      } else {
        this.profList = this.instructor.first_name + ' ' +
                this.instructor.last_name;
      }
    } else {
      this.profList = 'No instructor listed';
    }
    this.type = SectionData.type;
    this.dclass_code = SectionData.dclass_code;
    this.section_title = SectionData.section_title;
    this.number_registered = SectionData.number_registered;
    this.spaces_available = SectionData.spaces_available;
    if (typeof SectionData.start_time == 'string') {
      this.start_time = SectionData.start_time;
      this.startMinutes = parseInt(SectionData.start_time.slice(-2));
      this.startHours = parseInt(SectionData.start_time.slice(0, 2));
    } else {
      this.start_time = 'TBA';
    }
    if (typeof SectionData.end_time == 'string') {
      this.end_time = SectionData.end_time;
      this.endMinutes = parseInt(SectionData.end_time.slice(-2));
      this.endHours = parseInt(SectionData.end_time.slice(0, 2));
    } else {
      this.end_time = 'TBA';
    }
    this.day = SectionData.day;
    this.daySections = [];
    this.units = SectionData.units;
    if (typeof SectionData.scheduled == 'boolean') {
      this.scheduled = SectionData.scheduled;
    } else {
      this.scheduled = false;
    }
    if (typeof SectionData.registered == 'boolean') {
      this.registered = SectionData.registered;
    } else {
      this.registered = false;
    }
    if (typeof SectionData.pinned == 'boolean') {
      this.pinned = SectionData.pinned;
    } else {
      this.pinned = false;
    }
    this.parsedDay = '';
    if (typeof this.day == 'string') {
      let dayParse = this.day;
      while (dayParse != '') {
        const currentDay = dayParse.slice(0, 1);
        dayParse = dayParse.slice(1);
        // The daySections array makes work with the calendar easier
        // Each time a section meets is a distinct daySection
        // i.e. section 50342 may always be at 8:30
        // but it meets once on Tuesday (one daySection under 50342)
        // and once on Thursday (another daySection under 50342)
        this.daySections.push({day: currentDay});
        if (currentDay == 'T') {
          this.parsedDay += 'Tu';
        } else if (currentDay == 'H') {
          this.parsedDay += 'Th';
        } else {
          this.parsedDay += currentDay;
        }
      }
    }
    this.sched = () => this.schedule();
    this.unsched = () => this.unschedule();
    this.pintoggle = () => {
      if (this.pinned) {
        this.unpin();
      } else {
        this.pin();
      }
    };
    this.calDragStart = (event) =>
      calDragStart(this.parent, this.type, this, event);
    this.calDragEnd = () => calDragEnd(this);
  }
  createHTML(addTo, type) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'searchSection';

    addElement('p', 'sectionLabel', sectionDiv, this.id + ' ' +
        this.dclass_code + ': ' + this.type);

    // Display days for which this section meets
    let dayText;
    if (typeof this.day == 'string') {
      dayText = this.parsedDay;
    } else {
      dayText = 'No days listed, times:';
    }
    addElement('p', '', sectionDiv, dayText + ' ' +
        this.start_time + '-' + this.end_time);

    // Display instructor name
    addElement('p', '', sectionDiv, this.profList);

    // Show section title if one exists
    if (typeof this.section_title == 'string') {
      addElement('p', '', sectionDiv, this.section_title);
    }

    // Shows number of people registered for a section, and "closed" if full
    if (this.number_registered >= this.spaces_available) {
      const numReg = addElement('p', '', sectionDiv,
          this.number_registered + '/' + this.spaces_available + ' Closed');
      numReg.style.color = 'red';
    } else {
      addElement('p', '', sectionDiv,
          this.number_registered + '/' + this.spaces_available);
    }

    // Add "schedule section" and "pin" button if this is for myClasses
    // As well as registration status indicator
    if (type == 'myClasses') {
      const schedSectButton = addElement('i', 'fa-solid fa-plus',
          sectionDiv, '');
      schedSectButton.addEventListener('click', this.sched);

      const pinButton = addElement('i', 'fa-solid fa-thumbtack',
          sectionDiv, '');
      pinButton.addEventListener('click', this.pintoggle);
      if (this.pinned) {
        pinButton.classList.toggle('active');
      }

      const registeredIcon = addElement(
          'i', 'fa-solid registeredIcon', sectionDiv, '');
      if (this.registered) {
        registeredIcon.classList.add('fa-clipboard-check');
        registeredIcon.title = 'This section is registered';
      } else {
        registeredIcon.classList.add('fa-clipboard');
        registeredIcon.title = 'This section is not registered';
      }
    }


    this.sectionDiv = sectionDiv;
    addTo.appendChild(sectionDiv);
    return this.sectionDiv;
  }
  // Checks if the section conflicts with any already scheduled ones
  // If not, creates divs on the calendar for each day of the section
  conflicts() {
    const start = this.startMinutes + this.startHours*60;
    const end = this.endMinutes + this.endHours*60;
    const ret = [];
    for (let i = 0; i<calSections.length; i++) {
      const startCheck = calSections[i].startMinutes +
          calSections[i].startHours*60;
      const endCheck = calSections[i].endMinutes +
          calSections[i].endHours*60;

      if ((start>=startCheck && start<=endCheck) ||
                (end>=startCheck && end<=endCheck)) {
        for (let j = 0; j<this.daySections.length; j++) {
          const matches = calSections[i].daySections.filter(
              (e) => e.day === this.daySections[j].day);
          if (matches.length > 0) {
            ret.push(matches);
          }
        }
      }
    }
    return ret;
  }
  schedule() {
    if (this.conflicts().length > 0) {
      alert('This section conflicts with an already scheduled section');
      return false;
    } else {
      const cal = document.getElementById('scrollcal');
      const unschedButton = [];
      // Creates a div on the calendar for each daySection
      for (let i = 0; i<this.daySections.length; i++) {
        const sectionDivText = this.code + ': (' + this.id + '), ' +
                this.type + '. ' + this.profList;
        const sectionDiv = addElement('div', 'calsection', cal,
            sectionDivText);
        // Adds hover text showing the section text (in case text is
        // too long and gets cut off).
        // Maybe adds unneccessary clutter?
        sectionDiv.setAttribute('title', sectionDivText);
        // Make the section draggable
        sectionDiv.setAttribute('draggable', true);
        sectionDiv.addEventListener('dragstart', this.calDragStart);
        sectionDiv.addEventListener('dragend', this.calDragEnd);
        // Add unscheduling button to calendar div
        unschedButton.push(addElement(
            'button', 'fa-solid fa-xmark', sectionDiv, ''));
        // Add number currently registered to calendar div
        addElement('p', 'calnumreg', sectionDiv, this.number_registered + '/' +
                this.spaces_available);

        this.daySections[i].sectionDiv = sectionDiv;
      }
      for (let i = 0; i<unschedButton.length; i++) {
        unschedButton[i].addEventListener('click', () =>
          this.unschedule(),
        );
      }
      // Position the newly created div on the calendar based on date/time
      this.position();

      // Change the schedule section button in myClasses to unschedule section
      const schedSectButton =
          this.sectionDiv.getElementsByClassName('fa-plus')[0];
      schedSectButton.classList.toggle('fa-plus');
      schedSectButton.classList.toggle('fa-xmark');

      schedSectButton.removeEventListener('click', this.sched);
      schedSectButton.addEventListener('click', this.unsched);

      // If this.scheduled was already true, the .scheduled status of this
      // did not change and all that needs to be done is the creation of the
      // section. Otherwise, update this.scheduled and save to local storage
      if (!this.scheduled) {
        this.scheduled = true;
        saveMyClasses();
      }

      // Find the matching sectionTypes title text
      // and update number scheduled
      this.parent.sectionTypes.filter((e) => e.type == this.type)[0]
          .setDivTitle();

      // Add the section to the array of currently scheduled sections
      calSections.push(this);

      colorClasses();
      crossOutConflicts();
      return true;
    }
  }
  // Properly positions the section's divs on calendar according to date/time
  position() {
    for (let i = 0; i<this.daySections.length; i++) {
      positionDaySection(this.daySections[i].sectionDiv, this.startHours,
          this.startMinutes, this.endHours, this.endMinutes,
          this.daySections[i].day);
    }
  }
  unschedule() {
    this.scheduled = false;
    // Change the "unschedule section" button in myClasses to "schedule section"
    const schedSectButton =
        this.sectionDiv.getElementsByClassName('fa-xmark')[0];
    schedSectButton.classList.toggle('fa-plus');
    schedSectButton.classList.toggle('fa-xmark');

    schedSectButton.removeEventListener('click', this.unsched);
    schedSectButton.addEventListener('click', this.sched);

    // Find the matching sectionTypes title text
    // and update number scheduled
    this.parent.sectionTypes.filter((e) => e.type == this.type)[0]
        .setDivTitle();

    const index = calSections.indexOf(this);
    // Remove the html div for the section from the calendar
    for (let j = 0; j<calSections[index].daySections.length; j++) {
      calSections[index].daySections[j].sectionDiv.remove();
    }
    // Remove the section from the array of scheduled sections
    calSections.splice(index, 1);
    // Save myClasses because this.scheduled has changed
    saveMyClasses();
    colorClasses();
    crossOutConflicts();
  }
  pin() {
    const displayOrder = this.parent.sectionTypes.filter((e) =>
      e.type == this.type)[0].displayOrder;
    // Remove this section from the displayOrder
    // and add it again at the front
    displayOrder.unshift(
        displayOrder.splice(displayOrder.indexOf(this), 1)[0]);
    // Move the div in the interface up to the top of the list
    this.insertAnimated('before', displayOrder[1]);
    this.pinned = true;
    // Change the pin button color
    const pinButton = this.sectionDiv.getElementsByClassName('fa-thumbtack')[0];
    pinButton.classList.toggle('active');
    // Save myClasses
    saveMyClasses();
  }
  unpin() {
    const displayOrder = this.parent.sectionTypes.filter((e) =>
      e.type == this.type)[0].displayOrder;
    // Find the index at which the sections are no longer pinned
    let index = displayOrder.length;
    for (let i = 0; i<displayOrder.length; i++) {
      if (displayOrder[i].pinned == false) {
        index = i;
        break;
      }
    }
    // Move the div in the interface to the correct location
    // below the pinned area
    // If every section is pinned, an index will never be found
    // and there is no div to insert before
    if (index == displayOrder.length) {
      this.insertAnimated('after');
    } else {
      this.insertAnimated('before', displayOrder[index]);
    }
    // Remove this section from the displayOrder
    // and add it at the previously found index
    displayOrder.splice(
        index-1, 0, displayOrder.splice(displayOrder.indexOf(this), 1)[0]);
    this.pinned = false;
    // Change the pin button color
    const pinButton = this.sectionDiv.getElementsByClassName('fa-thumbtack')[0];
    pinButton.classList.toggle('active');
    // Save myClasses
    saveMyClasses();
  }
  async insertAnimated(beforeOrAfter, destSection) {
    const scaleY0 = [
      {transform: 'scaleY(1)'},
      {transform: 'scaleY(0)'},
    ];
    const scaleY1 = [
      {transform: 'scaleY(0)'},
      {transform: 'scaleY(1)'},
    ];
    await this.sectionDiv.animate(scaleY0, 100).finished;
    if (beforeOrAfter == 'before') {
      if (typeof destSection == 'object') {
        this.sectionDiv.parentNode.insertBefore(
            this.sectionDiv, destSection.sectionDiv);
      }
    } else {
      this.sectionDiv.parentNode.appendChild(this.sectionDiv);
    }
    this.sectionDiv.animate(scaleY1, 100);
  }
  setRegInfo(registered) {
    const registeredIcon =
        this.sectionDiv.getElementsByClassName('registeredIcon')[0];
    if (registered) {
      this.registered = true;
      registeredIcon.classList.add('fa-clipboard-check');
      registeredIcon.classList.remove('fa-clipboard');
      registeredIcon.title = 'This section is registered';
      if (!this.pinned) {
        this.pin();
      }
    } else {
      this.registered = false;
      registeredIcon.classList.add('fa-clipboard');
      registeredIcon.classList.remove('fa-clipboard-check');
      registeredIcon.title = 'This section is not registered';
    }
  }
}

function displayLoadingStatus(done) {
  const loading = document.getElementById('loadingOverlay');
  if (!done) {
    loading.style.display = 'block';
  } else {
    loading.style.display = 'none';
  }
}

async function webRegTermSelect() {
  try {
    return await fetch('https://my.usc.edu/portal/oasis/webregbridge.php', {method: 'GET'})
        .then(async function(response1) {
          console.log(response1);

          const termSelectURL = 'https://webreg.usc.edu/Terms/termSelect?term=' +
          encodeURIComponent(term);
          return await fetch(termSelectURL, {method: 'GET'})
              .then((response) => {
                console.log(response);
                if (response.url == 'https://webreg.usc.edu/close') {
                  displayLoginStatus(false);
                  return false;
                } else if (response.url == 'https://webreg.usc.edu/Departments') {
                  displayLoginStatus(true);
                  return true;
                } else {
                  throw new Error('Error connecting to webreg');
                }
              });
        });
  } catch (error) {
    displayLoginStatus(false);
    console.error(error);
    throw new Error('Error connecting to webreg');
  }
}

async function getCourseBin() {
    return await webRegTermSelect()
        .then((loggedIn) => {
          if (!loggedIn) {
          throw new Error('Error fetching CourseBin, ' +
            'you are likely not logged in to my.usc.edu');
          } else {
            return fetch('https://webreg.usc.edu/Scheduler/Read', {method: 'POST'})
                .then((response) => response.json())
                .then((data) => {
                  for (let i = 0; i<data.Data.length; i++) {
                    parseCourseBinElement(data.Data[i]);
                  }
                  return scheduleFromParsedBin(data.Data);
                });
          }
        });
}

// Takes in raw courseBin data from USC and extracts info
// in the format used by the rest of this code
function parseCourseBinElement(element) {
  // Extracts course code and ID from the USC-provided Title value which
  // houses all the relevant info in one string
  const paren1 = element.Title.indexOf('(');
  const paren2 = element.Title.indexOf(')');
  element.code = element.Title.slice(0, paren1 - 1);
  element.id = element.Title.slice(paren1 + 1, paren2);

  const registered = element.Scheduled.slice(1, 2);
  if (registered == 'N') {
    element.registered = false;
  } else if (registered == 'Y') {
    element.registered = true;
  } else {
    throw new Error('CourseBin data is not in the expected format');
  }
}

// Takes in a courseBin array that has already been parsed
// by parseCourseBinElement(), then makes a schedule from it
// in the format used by other functions
function scheduleFromParsedBin(courseBin) {
  const sections = [];
  for (let i = 0; i<courseBin.length; i++) {
    // If the current section is not already in the sections array
    // (by filtering for id match), add the section
    // This is necessary because the courseBin as provided by USC
    // shows daySections, not overall sections,
    // and thus has duplicates for our purposes
    if (sections.filter((e) => e.id == courseBin[i].id).length == 0) {
      sections.push({
        prefix: deptFromCode(courseBin[i].code),
        code: courseBin[i].code,
        id: courseBin[i].id,
        registered: courseBin[i].registered,
      });
    }
  }
  return {sections: sections};
}

// Adds a section to the USC CourseBin. It will be scheduled by default
async function addToCourseBin(dept, code, id) {
  const baseUrl = 'https://webreg.usc.edu/myCoursebin/SubmitSection';
  const selection = new FormData();
  selection.append('submit', 'Add to myCourseBin');
  selection.append('department', dept);
  selection.append('courseid', code);
  selection.append('sectionid', id);
  selection.append('grdoptchgflg', 'Y');
  selection.append('conccourseid', '');

  return await fetch(baseUrl, {method: 'POST', body: selection})
      .then((response) => response.text())
      .then((data) => {
        if (data == 'Added to Course Bin') {
          return true;
        } else if (data == 'Error Adding to Course Bin') {
          // This occurs if the section is already in the CourseBin
          return false;
        } else {
          throw new Error('Could not add to CourseBin');
        }
      });
}

// Schedules a section that is already in the USC CourseBin
async function scheduleCourseBin(id) {
  const baseUrl = 'https://webreg.usc.edu/myCoursebin/SchdUnschRmv?act=Sched&section=';
  const url = baseUrl + id;

  return await fetch(url);
  // Unfortunately USC servers do not return a meaningful response
  // for this request
}

// Unschedules a section that is already in the USC CourseBin
async function unscheduleCourseBin(id) {
  const baseUrl = 'https://webreg.usc.edu/myCoursebin/SchdUnschRmv?act=UnSched&section=';
  const url = baseUrl + id;

  return await fetch(url);
  // Unfortunately USC servers do not return a meaningful response
  // for this request
}

function deptFromCode(code) {
  const hyphen = code.indexOf('-');
  return code.slice(0, hyphen);
}

function searchDept(dept, term) {
  document.getElementById('loading').style.display = 'block';

  const url = 'https://web-app.usc.edu/web/soc/api/classes/' +
    encodeURIComponent(dept) + '/' + encodeURIComponent(term);

  fetch(url)
      .then((response) => response.json())
      .then((data) => showSearchedCourses(data.OfferedCourses.course, dept));
}

// Searches for a class matching given dept and code, then adds it to myClasses
async function searchAddClass(dept, term, code) {
  displayLoadingStatus(false);
  const url = 'https://web-app.usc.edu/web/soc/api/classes/' +
    encodeURIComponent(dept) + '/' + encodeURIComponent(term);
  return await fetch(url)
      .then((response) => response.json())
      .then((data) => {
        for (let i=0; i<data.OfferedCourses.course.length; i++) {
          const currentCourse =
              new Course(data.OfferedCourses.course[i].CourseData);
          if (currentCourse.code == code) {
            currentCourse.add();
          }
        };
        displayLoadingStatus(true);
      });
}

function showSearchedCourses(searchedCourseList, dept) {
  console.log(searchedCourseList); // For testing

  // Clear search results
  document.getElementById('searchResultsContainer').innerHTML = '';

  for (let i = 0; i<searchedCourseList.length; i++) {
    // Check that the course actually belongs in this search
    // (because USC's API will return all courses connected to a department,
    // even if they don't match the prefix
    // i.e. QBIO-401 will show up when searching for BISC courses
    // Webreg's own search only shows courses that match the prefix exactly)
    if (searchedCourseList[i].CourseData.prefix == dept) {
      new Course(searchedCourseList[i].CourseData).createHTML(
          document.getElementById('searchResultsContainer'), 'search');
    }
  }
  // Hide loading indicator now that search has successfully completed
  document.getElementById('loading').style.display = 'none';
}

function addElement(type, className, appendTo, text) {
  const element = document.createElement(type);
  if (className != '') {
    element.className = className;
  }
  element.appendChild(document.createTextNode(text));
  appendTo.appendChild(element);
  return element;
}

function toggleShow(element) {
  if (element.style.display == 'block') {
    element.style.display = 'none';
  } else {
    element.style.display = 'block';
  }
}

function accordion() {
  // Toggle display of dropdown div
  toggleShow(this.nextElementSibling);
  // Toggle icon pointing up/down
  this.getElementsByClassName('dropIcon')[0]
      .classList.toggle('fa-chevron-down');
  this.getElementsByClassName('dropIcon')[0]
      .classList.toggle('fa-chevron-up');
}

// Returns the index if the given array contains a class
// matching the given code, or -1 if not
function containsClass(arr, code) {
  for (let i=0; i<arr.length; i++) {
    if (arr[i].code == code) {
      return i;
    }
  }
  return -1;
}

// Displays all saved classes in the "my classes" div of the webpage
function showMyClasses() {
  // Clear classes div
  document.getElementById('myClassesContainer').innerHTML = '';
  for (let i=0; i<classes.length; i++) {
    classes[i].createHTML(
        document.getElementById('myClassesContainer'), 'myClasses');
  }
}

function unscheduleAll() {
  while (calSections.length>0) {
    calSections[0].unschedule();
  }
}

// Makes a deep copy of myClasses then removes that deep copy of any circular
// references which could cause chrome.storage to fail, then stores it.
async function saveMyClasses() {
  const noncircular = [];
  for (let i = 0; i<classes.length; i++) {
    noncircular.push(new Course(classes[i]));
  }
  for (let i = 0; i<noncircular.length; i++) {
    for (let j = 0; j<noncircular[i].SectionData.length; j++) {
      noncircular[i].SectionData[j].parent = null;
    }
  }
  await chrome.storage.local.set({'classes': noncircular});
}

function saveSchedule(name) {
  const sections = [];
  for (let i=0; i<calSections.length; i++) {
    const section = {};
    section.prefix = calSections[i].prefix;
    section.code = calSections[i].code;
    section.id = calSections[i].id;
    sections.push(section);
  }
  // If there already exists a schedule with that name, overwrite it
  for (let i=0; i<schedules.length; i++) {
    if (schedules[i].name==name) {
      if (confirm(
          'A saved schedule with that name already exists, overwrite it?')) {
        schedules[i].sections = sections;
        chrome.storage.local.set({'schedules': schedules});
        // Displays name of saved schedule in dropdown bar
        document.getElementById('schedinput').value = name;
      }
      return;
    }
  }
  // If a schedule with that name doesn't exist, this will be reached
  // and the new schedule will be pushed
  schedules.push({name: name, sections: sections});
  chrome.storage.local.set({'schedules': schedules});
  // Update schedule list dropdown
  createScheduleList();
}

// Unschedules current schedule and loads the given
// schedule[] where each element has {prefix, code, id}
async function loadSchedule(schedule) {
  unscheduleAll();
  // Iterate through each section in the schedule
  for (let i=0; i<schedule.sections.length; i++) {
    let index = containsClass(classes, schedule.sections[i].code);
    // If the class is not in myClasses, add it and update the index
    if (index == -1) {
      await searchAddClass(
          schedule.sections[i].prefix, term, schedule.sections[i].code);
      index = classes.length-1;
    }
    // Find the section matching the ID and schedule it
    classes[index].SectionData.filter((e) => e.id == schedule.sections[i].id)[0]
        .schedule();
  }
}

// Adds listings for each saved schedule to dropdown
function createScheduleList() {
  const dropdown = document.getElementById('scheddropdown');
  dropdown.innerHTML = '';
  for (let i=0; i<schedules.length; i++) {
    const listEntry = addElement('li', '', dropdown, schedules[i].name);
    listEntry.addEventListener('click', function() {
      loadSchedule(schedules[i]);
      // Displays name of loaded schedule in dropdown bar
      document.getElementById('schedinput').value = schedules[i].name;
    });
  }
}

function showAllScheduled() {
  for (let i=0; i<classes.length; i++) {
    for (let j = 0; j<classes[i].SectionData.length; j++) {
      if (classes[i].SectionData[j].scheduled) {
        classes[i].SectionData[j].schedule();
      }
    }
  }
}

function setAllSectionPositions() {
  for (let x = 0; x<calSections.length; x++) {
    calSections[x].position();
  }
}

function positionDaySection(
    div, startHours, startMinutes, endHours, endMinutes, day) {
  // Probably inefficient to get every element
  // with this class name every single time
  const calDay = document.getElementsByClassName('cal-day');
  const timeRect =
    document.getElementsByClassName('cal-time')[1].getBoundingClientRect();
  const headerRect =
    document.getElementsByClassName('thead')[0].getBoundingClientRect();

  const timeOffset = ((startHours-5)*2+startMinutes/30)*7+7;
  let dayOffset = 0;
  if (day == 'M') {
    dayOffset += 1;
  } else if (day == 'T') {
    dayOffset += 2;
  } else if (day == 'W') {
    dayOffset += 3;
  } else if (day == 'H') {
    dayOffset += 4;
  } else if (day == 'F') {
    dayOffset += 5;
  } else if (day == 'S') {
    dayOffset += 6;
  }
  const cellRect = calDay[timeOffset+dayOffset].getBoundingClientRect();

  const top = cellRect.y - calDay[7+dayOffset].getBoundingClientRect().y +
        headerRect.height;
  const height = cellRect.height / 30 *
        ((endHours-startHours)*60 + endMinutes-startMinutes);

  div.style.top = top.toString() + 'px';
  div.style.height = height.toString() + 'px';

  div.style.left = (cellRect.x - timeRect.x).toString() + 'px';
  div.style.width = (0.95*cellRect.width).toString() + 'px';
}

function findCalSectionByID(id) {
  for (let i=0; i<calSections.length; i++) {
    if (calSections[i].id == id) {
      return calSections[i];
    }
  }
}

// For section being dragged
function calDragStart(course, type, current, event) {
  setTimeout(function() {
    showPossiblePositions(course, type, current);
    // Make the section being dragged translucent
    for (let i=0; i<current.daySections.length; i++) {
      current.daySections[i].sectionDiv.style.opacity = '0.5';
    }
  }, '10');
  event.dataTransfer.setData('text/plain', current.id);
}

function calDragEnd(current) {
  unshowPossible();
  // Make the section being dragged non-translucent again
  for (let i = 0; i < current.daySections.length; i++) {
    current.daySections[i].sectionDiv.style.opacity = '1';
  }
}
// For possible sections
function calDragEnter(section) {
  section.daySections.forEach((daySection) => {
    if (typeof daySection.sectionDiv == 'object') {
      daySection.sectionDiv.classList.add('dragover');
  }
  });
}
function calDragLeave(section) {
  section.daySections.forEach((daySection) => {
    if (typeof daySection.sectionDiv == 'object') {
      daySection.sectionDiv.classList.remove('dragover');
  }
  });
}
function calDrop(orig, event) {
  const dropSection =
    findCalSectionByID(event.dataTransfer.getData('text/plain'));
  dropSection.unschedule();
  // If the new section fails to schedule (because of a conflict), reschedule
  // the original so everything remains as before
  if (!orig.schedule()) {
    dropSection.schedule();
  }
}

function calMultipleDragEnter(outerdiv, div, daySections) {
  const list = addElement('div',
      'calpossiblelist', outerdiv, '');
  const divRect = div.getBoundingClientRect();
  const outerdivRect = outerdiv.getBoundingClientRect();
  list.style.top = div.style.top;
  list.style.left = (divRect.right - outerdivRect.left - 5).toString() + 'px';
  for (let i=0; i<daySections.length; i++) {
    daySections[i].sectionDiv = calPossible(daySections[i], list);
  }
  return list;
}

function calMultipleDragLeave(list) {
  list.remove();
}

// Generate a calpossible div for given daySection
function calPossible(daySection, addTo) {
  const div = addElement('div', 'calsection calpossible',
      addTo, daySection.parent.number_registered + '/' +
      daySection.parent.spaces_available);
  div.appendChild(document.createElement('br'));
  div.appendChild(document.createTextNode(daySection.parent.profList));
  if (daySection.parent.day.length>1) {
    div.appendChild(document.createElement('br'));
    div.appendChild(document.createTextNode(daySection.parent.parsedDay));
  }
  div.addEventListener(
      'dragenter', function(event) {
        event.preventDefault();
        calDragEnter(daySection.parent);
      });
  div.addEventListener(
      'dragover', function(event) {
        event.preventDefault();
      });
  div.addEventListener(
      'dragleave', function() {
        calDragLeave(daySection.parent);
      });
  div.addEventListener(
      'drop', function(event) {
        calDrop(daySection.parent.orig, event);
      });
  return div;
}

function timeDayMatch(e, compare, index) {
  return e.start_time == compare.start_time &&
        e.end_time == compare.end_time &&
        e.day == compare.daySections[index].day;
}

// Check if two DOM elements are overlapping using axis-aligned bounding boxes
function rectOverlap(e, compare) {
  const rect = e.getBoundingClientRect();
  const compRect = compare.getBoundingClientRect();
  return (rect.left < compRect.right &&
        rect.right > compRect.left &&
        rect.top < compRect.bottom &&
        rect.bottom > compRect.top);
}

let possibleSections = [];
let unique = [];
function showPossiblePositions(course, type, current) {
  // Create array of all sections of given type for the given class
  for (let i=0; i<course.SectionData.length; i++) {
    if (course.SectionData[i].type === type &&
        course.SectionData[i] !== current) {
      possibleSections.push(new Section(course.SectionData[i]));
      // Add pointer to the original section in myClasses
      possibleSections[possibleSections.length-1].orig = course.SectionData[i];
    }
  }
  // Create a list of unique start time/end time/day combinations
  // and all corresponding daySections
  for (let i=0; i<possibleSections.length; i++) {
    for (let j=0; j<possibleSections[i].daySections.length; j++) {
      // Add pointer to each daySection's overall section
      possibleSections[i].daySections[j].parent = possibleSections[i];

      // Check if this start/end/day combination is already in the
      // unique array, and if not, add it along w/ the current daySection
      if (unique.filter(
          (e) => timeDayMatch(e, possibleSections[i], j)).length==0) {
        unique.push({
          start_time: possibleSections[i].start_time,
          end_time: possibleSections[i].end_time,
          day: possibleSections[i].daySections[j].day,
          daySections: [possibleSections[i].daySections[j]],
        });

      // If this start/end/day combination already exists in the
      // unique array, add this daySection to that existing entry
      } else {
        unique[
            unique.findIndex((e) => timeDayMatch(e, possibleSections[i], j))
        ].daySections.push(possibleSections[i].daySections[j]);
      }
    }
  }
  for (let i=0; i<unique.length; i++) {
    if (unique[i].daySections.length==1 &&
      !timeDayMatch(current, unique[i], 0)) {
      unique[i].daySections[0].sectionDiv = calPossible(
          unique[i].daySections[0], document.getElementById('scrollcal'));
      positionDaySection(unique[i].daySections[0].sectionDiv,
          unique[i].daySections[0].parent.startHours,
          unique[i].daySections[0].parent.startMinutes,
          unique[i].daySections[0].parent.endHours,
          unique[i].daySections[0].parent.endMinutes,
          unique[i].daySections[0].day);
    } else {
      unique[i].outerdiv = addElement('div',
          'calpossiblemult', document.getElementById('scrollcal'), '');
      unique[i].div = addElement('div',
          'calsection calpossible',
          unique[i].outerdiv, '...');
      unique[i].div.addEventListener(
          'dragenter', function(event) {
            event.preventDefault();
            // Create list div only if it doesn't already exist
            if (typeof unique[i].list == 'undefined') {
              unique[i].list = calMultipleDragEnter(
                  unique[i].outerdiv, unique[i].div, unique[i].daySections);
            }
          });
      unique[i].div.addEventListener(
          'dragover', function(event) {
            event.preventDefault();
          });
      unique[i].outerdiv.addEventListener(
          'dragleave', function(e) {
            const divRect = unique[i].div.getBoundingClientRect();
            const listRect = unique[i].list.getBoundingClientRect();
            // Check that the cursor is outside both the list and the
            // calpossible div, and only then remove the list div
            if ((e.clientY < listRect.top ||
                    e.clientY >= listRect.bottom ||
                    e.clientX < listRect.left ||
                    e.clientX >= listRect.right) &&
                    (e.clientY < divRect.top ||
                    e.clientY >= divRect.bottom ||
                    e.clientX < divRect.left ||
                    e.clientX >= divRect.right)) {
              calMultipleDragLeave(unique[i].list);
              unique[i].list = undefined;
            }
          });
      positionDaySection(
          unique[i].div,
          unique[i].daySections[0].parent.startHours,
          unique[i].daySections[0].parent.startMinutes,
          unique[i].daySections[0].parent.endHours,
          unique[i].daySections[0].parent.endMinutes,
          unique[i].daySections[0].day);
    }
  }
  // If sections overlap but not perfectly, scales down their width
  // to fit them usably side by side
  for (let i=0; i<unique.length; i++) {
    // Holds all divs that overlap with unique[i]
    let overlaps = [];
    // Adjusts for div variable placement based on whether this unique time
    // has multiple sections or just one
    let div;
    if (unique[i].daySections.length==1) {
      div = unique[i].daySections[0].sectionDiv;
    } else {
      div = unique[i].div;
    }
    // Sets a base width denominator of 1 for this div, if one is not set
    if (typeof unique[i].widthDenom == 'undefined') {
      unique[i].widthDenom = 1;
    }
    const origWidth = parseFloat(div.style.width);
    for (let j=0; j<unique.length; j++) {
      // Skips checking for overlaps of a section with itself
      if (unique[i]==unique[j]) {
        continue;
      }
      // Adjusts for div variable placement based on whether this unique time
      // has multiple sections or just one
      let div2;
      if (unique[j].daySections.length==1) {
        div2 = unique[j].daySections[0].sectionDiv;
      } else {
        div2 = unique[j].div;
      }
      // Sets a base width denominator of 1 for this div, if one is not set
      if (typeof unique[j].widthDenom == 'undefined') {
        unique[j].widthDenom = 1;
      }
      // Checks if div j overlaps with div i
      // and if so adds j to the overlap array
      if (rectOverlap(div, div2)) {
        overlaps.push({div: div2, unique: unique[j]});
      }
    }
    // Adjusts width and left-offset of given div, based on widthDenom value
    function adjustWidth(adjustDiv, unique) {
      unique.widthDenom++;
      adjustDiv.style.width = (origWidth/unique.widthDenom).toString() + 'px';
      if (adjustDiv != div) {
        adjustDiv.style.left = parseFloat(adjustDiv.style.left) +
                parseFloat(adjustDiv.style.width) + 1 + 'px';
      }
    }
    // Decreases width of overlapping sections and pushes them to the right
    // until no overlaps remain (for this iteration of unique[i])
    while (overlaps.length>0) {
      const temp = overlaps;
      overlaps = [];
      adjustWidth(div, unique[i]);
      for (let j=0; j<temp.length; j++) {
        if (temp[j].unique.widthDenom<unique[i].widthDenom) {
          adjustWidth(temp[j].div, temp[j].unique);
        }
        if (rectOverlap(div, temp[j].div)) {
          overlaps.push(temp[j]);
        }
      }
    }
  }
}


function unshowPossible() {
  for (let i = 0; i<possibleSections.length; i++) {
    for (let j = 0; j<possibleSections[i].daySections.length; j++) {
      if (typeof possibleSections[i].daySections[j].sectionDiv != 'undefined') {
        possibleSections[i].daySections[j].sectionDiv.remove();
      }
    }
  }
  for (let i=0; i<unique.length; i++) {
    if (typeof unique[i].outerdiv != 'undefined') {
      unique[i].outerdiv.remove();
    }
  }
  possibleSections = [];
  unique = [];
}

// Color each distinct class (not section) on the calendar a different color
function colorClasses() {
  const colors = [
    '#fcd444',
    '#fc4444',
    '#029658',
    '#2f64c1',
    '#b178aa',
    '#fc6404',
    '#f978aa',
    '#8cc43c',
    '#5bc0de',
    '#1abc9c'];

  // Finds how many distinct classes are scheduled
  schedClasses = [];
  for (let i = 0; i<calSections.length; i++) {
    if (!schedClasses.includes(calSections[i].code)) {
      schedClasses.push(calSections[i].code);
    }
  }
  // Goes through the scheduled sections and colors them by class
  for (let i = 0; i<calSections.length; i++) {
    const index =
      schedClasses.findIndex((element) => element==calSections[i].code);
    for (let j = 0; j<calSections[i].daySections.length; j++) {
      calSections[i].daySections[j].sectionDiv.style.background = colors[index];
    }
  }
}

function crossOutConflicts() {
  for (let i=0; i<classes.length; i++) {
    for (let j=0; j<classes[i].SectionData.length; j++) {
      if (classes[i].SectionData[j].scheduled==false) {
        const slashIconArr = classes[i].SectionData[j].sectionDiv
            .getElementsByClassName('fa-slash');
        if (classes[i].SectionData[j].conflicts().length>0) {
          // Adds a slash to visually cross out the add section icon
          // if the section conflicts with a scheduled section
          // (and such a slash hasn't already been added)
          if (slashIconArr.length==0) {
            const slash = addElement('i', 'fa-solid fa-slash',
                classes[i].SectionData[j].sectionDiv
                    .getElementsByClassName('fa-plus')[0], '');

            slash.setAttribute('title',
                'This section conflicts with an already scheduled section',
            );
          }
        } else {
          if (slashIconArr.length>0) {
            slashIconArr[0].remove();
          }
        }
      }
    }
  }
}

async function updateInfo(term) {
  displayLoadingStatus(false);
  try {
    await updateBasicInfo(term);
    await updateUniqueInfo(term);

    // Once all classes/departments have been done,
    // save the updated info
    // and reload the page so HTML can be regenerated

    // For some reason the usual local.storage.set method for saving classes
    // causes a quota exceeded exception here, even though it works elsewhere.
    // Possible cause of the issue is the fact that sections have .parent
    // properties linking them in a circular manner to their parents,
    // saveMyClasses() saves the classes array without those.
    await saveMyClasses();

    lastRefresh = new Date();
    lastRefresh =
        lastRefresh.toLocaleString('default', {month: 'short'}) +
        ' ' + lastRefresh.getDate() + ' ' +
        lastRefresh.toLocaleTimeString(
            'en-US', {hour: '2-digit', minute: '2-digit'});

    await chrome.storage.local.set({'lastRefresh': lastRefresh});
    displayLoadingStatus(true);
  } catch (error) {
    alert(error);
    console.error(error);
  }
  location.reload();
}

// Gets new info from USC servers and updates info for each class in myClasses
async function updateBasicInfo(term) {
  // Find all needed departments to update classes from
  const depts = [];
  for (let i=0; i<classes.length; i++) {
    if (!depts.includes(classes[i].prefix)) {
      depts.push(classes[i].prefix);
    }
  }
  // Pull info for each department, and update relevant classes in myClasses
  for (let i=0; i<depts.length; i++) {
    const url = 'https://web-app.usc.edu/web/soc/api/classes/' +
          encodeURIComponent(depts[i]) + '/' + encodeURIComponent(term);

    await fetch(url)
        .then((response) => response.json())
        .then((data) => {
          // Iterate through all classes in myClasses
          for (let j=0; j<classes.length; j++) {
            // Proceed if the current class is in this searched department
            if (classes[j].prefix==depts[i]) {
              // Iterate through all the classes returned by search
              // and check if they are the same class as the current
              // class from myClass to be updated
              for (let k=0; k<data.OfferedCourses.course.length; k++) {
                const currentCourse = new Course(
                    data.OfferedCourses.course[k].CourseData);
                if (classes[j].code == currentCourse.code) {
                  const toDelete = [];

                  // Once class match is found, iterate through
                  // each section and update it with the
                  // corresponding section from search
                  for (let l=0; l<classes[j].SectionData.length; l++) {
                    const matches = currentCourse.SectionData.filter(
                        (e) => e.id === classes[j].SectionData[l].id);
                    if (matches.length==1) {
                      const scheduled = classes[j].SectionData[l].scheduled;
                      const registered = classes[j].SectionData[l].registered;
                      const pinned = classes[j].SectionData[l].pinned;
                      const sectionDiv = classes[j].SectionData[l].sectionDiv;
                      classes[j].SectionData[l] = matches[0];
                      classes[j].SectionData[l].scheduled = scheduled;
                      classes[j].SectionData[l].registered = registered;
                      classes[j].SectionData[l].pinned = pinned;
                      classes[j].SectionData[l].sectionDiv = sectionDiv;

                    // If the section no longer has a match in
                    // USC schedule of classes, add it to the
                    // list of sections to be deleted
                    } else if (matches.length==0) {
                      toDelete.push(classes[j].SectionData[l]);
                    } else {
                      // TODO: Expand error catching for this
                      alert('Error updating class info');
                    }
                  }
                  // Delete all sections queued for deletion
                  for (let l=0; l<toDelete.length; l++) {
                    classes[j].SectionData.splice(
                        classes[j].SectionData.indexOf(
                            toDelete[l]), 1);
                  }
                  // Add any new sections not previously present
                  for (let l=0; l<currentCourse.SectionData.length; l++) {
                    const matches = classes[j].SectionData.filter(
                        (e) => e.id === currentCourse.SectionData[l].id);
                    if (matches.length==0) {
                      classes[j].SectionData.push(currentCourse.SectionData[l]);
                    }
                  }
                }
              }
            }
          }
        });
  }
}

async function updateUniqueInfo(term) {
  // Get courseBin schedule
  const courseBinSched = await getCourseBin();
  // Add all missing classes
  for (let i = 0; i<courseBinSched.sections.length; i++) {
    if (containsClass(classes, courseBinSched.sections[i].code) == -1) {
      // If the class is not in myClasses, search for its data and add it
      await searchAddClass(courseBinSched.sections[i].prefix, term,
          courseBinSched.sections[i].code);
    }
  }
  // Update reg info
  handleUpdatedRegInfo(courseBinSched);
}

// Listen for changes in webpage zoom, update calendar div positions if needed
function monitorDevicePixelRatio() {
  function onPixelRatioChange() {
    setAllSectionPositions();
    monitorDevicePixelRatio();
  }
  matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      .addEventListener('change', onPixelRatioChange, {once: true});
}
monitorDevicePixelRatio();

// Update calendar div positions on window resize
window.addEventListener('resize', setAllSectionPositions);

function setTablePadding(padding) {
  const cells = document.getElementsByTagName('td');
  for (let i = 0; i<cells.length; i++) {
    cells[i].style.paddingTop = padding + 'px';
    cells[i].style.paddingBottom = padding + 'px';
  }
}
// Increase calendar height until it fills the height of the window
let tablePadding = 11;
const windowHeight = window.innerHeight;
let tableBottom =
    document.getElementsByClassName('cal-day')[258].getBoundingClientRect();
while (tableBottom.y<windowHeight) {
  tablePadding++;
  setTablePadding(tablePadding);
  tableBottom =
      document.getElementsByClassName('cal-day')[258].getBoundingClientRect();
}
// Scrolls the calendar down a little so the user doesn't have to, since
// the calendar starts at 5 AM but very few students have classes that early
document.getElementsByClassName('cal-day')[21].scrollIntoView(true);

const calSections = [];
chrome.storage.local.set({'term': '20223'});
let term;
let classes = [];
let schedules = [];
let lastRefresh;
chrome.storage.local.get(
    ['term', 'classes', 'schedules', 'lastRefresh'], (data) => {
      term = data.term;
      lastRefresh = data.lastRefresh;
      if (typeof data.classes != 'undefined') {
        for (let i = 0; i<data.classes.length; i++) {
          classes.push(new Course(data.classes[i]));
        }
      } else {
        classes = [];
      }
      if (typeof data.schedules != 'undefined') {
        schedules = data.schedules;
      } else {
        schedules = [];
      };
      showMyClasses();
      createScheduleList();
      showAllScheduled();
      // Show last time class info was refreshed
      if (typeof lastRefresh == 'undefined') {
        document.getElementById('last').innerHTML = 'Last: never';
      } else {
        document.getElementById('last').innerHTML = 'Last: ' + lastRefresh;
      }
    });

// Adds search listener to dept search box
const input = document.getElementById('input');
input.addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    searchDept(event.target.value.toUpperCase(), term);
  }
});

// Makes it so that clicking the schedules dropdown button shows/hides dropdown
const button = document.getElementById('scheddropdownbutton');
button.addEventListener('click', function() {
  toggleShow(document.getElementById('schedinput').nextElementSibling);
  // Toggles button appearance to either up or down arrow
  button.classList.toggle('fa-caret-down');
  button.classList.toggle('fa-caret-up');
});

// Add save schedule functionality to "save schedule" button
// Takes the name of the new schedule from dropdown input box
document.getElementById('savesched').addEventListener('click', function() {
  saveSchedule(document.getElementById('schedinput').value);
});

// Add update class info functionality to relevant button click
document.getElementById('update').addEventListener('click', function() {
  updateInfo(term);
});

document.getElementById('classesbutton').addEventListener('click', function(e) {
  document.getElementById('classes').style.display = 'flex';
  document.getElementById('search').style.display = 'none';
  document.getElementById('webreg').style.display = 'none';
  e.target.classList.add('active');
  document.getElementById('searchbutton').classList.remove('active');
  document.getElementById('webregbutton').classList.remove('active');
});

document.getElementById('searchbutton').addEventListener('click', function(e) {
  document.getElementById('search').style.display = 'flex';
  document.getElementById('classes').style.display = 'none';
  document.getElementById('webreg').style.display = 'none';
  e.target.classList.add('active');
  document.getElementById('classesbutton').classList.remove('active');
  document.getElementById('webregbutton').classList.remove('active');
});

document.getElementById('webregbutton').addEventListener('click', function(e) {
  document.getElementById('webreg').style.display = 'flex';
  document.getElementById('classes').style.display = 'none';
  document.getElementById('search').style.display = 'none';
  e.target.classList.add('active');
  document.getElementById('classesbutton').classList.remove('active');
  document.getElementById('searchbutton').classList.remove('active');
});

function displayLoginStatus(status) {
  if (status == 'loading') {
    document.getElementById('loginStatus').classList.remove('fa-xmark');
    document.getElementById('loginStatus').classList.remove('fa-check');
    document.getElementById('loginStatus').classList.add('fa-spinner');
  } else if (status == true) {
    document.getElementById('loginStatus').classList.remove('fa-xmark');
    document.getElementById('loginStatus').classList.remove('fa-spinner');
    document.getElementById('loginStatus').classList.add('fa-check');
  } else {
    document.getElementById('loginStatus').classList.remove('fa-check');
    document.getElementById('loginStatus').classList.remove('fa-spinner');
    document.getElementById('loginStatus').classList.add('fa-xmark');
  }
}

async function loginTest() {
  displayLoginStatus('loading');
  webRegTermSelect();
}

loginTest();

document.getElementById('login').addEventListener(
    'click', function() {
      window.open('https://my.usc.edu');
    });

document.getElementById('termSelect').addEventListener(
    'click', function() {
      loginTest();
    });

// Gets parsed courseBin schedule from getCourseBin(), then
// loads the schedule using loadSchedule(),
// and also sets registration info for those classes that are registered
async function loadCourseBin() {
  displayLoadingStatus(false);
  try {
    const courseBinSched = await getCourseBin();
    await loadSchedule(courseBinSched);
    handleUpdatedRegInfo(courseBinSched);
  } catch (error) {
    console.error(error);
    alert(error);
  }
  displayLoadingStatus(true);
}

function handleUpdatedRegInfo(courseBinSched) {
  for (let i = 0; i<courseBinSched.sections.length; i++) {
    if (courseBinSched.sections[i].registered) {
      const course = classes.filter(
          (e) => e.code == courseBinSched.sections[i].code)[0];
      const section = course.SectionData.filter(
          (e) => e.id == courseBinSched.sections[i].id)[0];
      section.setRegInfo(true);
    }
  }
}

document.getElementById('loadCourseBin').addEventListener(
    'click', function() {
      loadCourseBin();
    });

async function pushToCourseBin() {
  displayLoadingStatus(false);

  const courseBinSched = await getCourseBin();

  for (section of courseBinSched.sections) {
    // If the section in the CourseBin
    // is not in the current schedule being pushed
    if (calSections.filter((e) => e.id == section.id).length == 0) {
      await unscheduleCourseBin(section.id);
    }
  }

  for (section of calSections) {
    // If the section is not already present in the CourseBin schedule
    if (courseBinSched.sections.filter((e) => e.id == section.id).length == 0) {
      // Attempt to add the section to CourseBin
      // If it is not in the CourseBin and is successfully added
      // (and auto-scheduled), true will be returned.
      // If it is already in the CourseBin but not scheduled, false will
      // be returned, and the inside of the if block will schedule it.
      const scheduled =
          await addToCourseBin(section.prefix, section.code, section.id);
      if (!scheduled) {
        await scheduleCourseBin(section.id);
      }
    }
  }
  displayLoadingStatus(true);
}

document.getElementById('pushCourseBin').addEventListener(
    'click', function() {
      pushToCourseBin();
    });
