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
    this.description = CourseData.description;
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
        this.SectionData.push(new CourseSection(
            CourseData.SectionData[i], this.code, this.prefix));
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
          new CourseSection(CourseData.SectionData, this.code, this.prefix));
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
          notification(
              'success', this.code + ' was successfully added to "My Classes"');
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

    // Add course description
    if (typeof this.description == 'string') {
      addElement(
          'p', 'extraInfo description', displayCourseInfo, this.description);
    }

    // Add pre-req and co-req info
    let extraInfo;
    if (typeof this.prereq_text == 'string') {
      extraInfo = addElement('div', '', displayCourseInfo, '');
      addElement('p', 'extraInfo', extraInfo,
          'Pre-reqs: ' + this.prereq_text);
    }
    if (typeof this.coreq_text == 'string') {
      if (typeof extraInfo == 'undefined') {
        extraInfo = addElement('div', '',
            displayCourseInfo, '');
      }
      addElement('p', 'extraInfo', extraInfo,
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
  constructor(SectionData, code) {
    this.code = code;
    if (typeof SectionData.start_time == 'string') {
      this.start_time = SectionData.start_time;
      this.startMinutes = getMinutes(SectionData.start_time);
      this.startHours = getHours(SectionData.start_time);
      this.start = this.startMinutes + this.startHours*60;
    } else {
      this.start_time = 'TBA';
    }
    if (typeof SectionData.end_time == 'string') {
      this.end_time = SectionData.end_time;
      this.endMinutes = getMinutes(SectionData.end_time);
      this.endHours = getHours(SectionData.end_time);
      this.end = this.endMinutes + this.endHours*60;
    } else {
      this.end_time = 'TBA';
    }
    this.day = SectionData.day;
    this.daySections = [];
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
  }
  // Checks if the section conflicts with any already scheduled one
  // and returns the conflicts
  conflicts() {
    const ret = [];
    for (let i = 0; i<calSections.length; i++) {
      if ((this.start>=calSections[i].start &&
          this.start<=calSections[i].end) ||
          (this.end>=calSections[i].start &&
          this.end<=calSections[i].end)) {
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
  // Properly positions the section's divs on calendar according to date/time
  position() {
    for (let i = 0; i<this.daySections.length; i++) {
      positionDaySection(this.daySections[i].sectionDiv, this.startHours,
          this.startMinutes, this.endHours, this.endMinutes,
          this.daySections[i].day);
    }
  }
  createCalSection(text) {
    const calendar = document.getElementById('scrollcal');
    const sectionDiv = addElement('div', 'calsection', calendar, text);
    // Adds hover text showing the section text (in case text is
    // too long and gets cut off).
    // Maybe adds unneccessary clutter?
    sectionDiv.setAttribute('title', text);
    // Add unscheduling button to calendar div
    const unschedButton = addElement(
        'button', 'fa-solid fa-xmark', sectionDiv, '');
    unschedButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.unschedule();
    });
    return sectionDiv;
  }
  removeCalSection() {
    const index = calSections.indexOf(this);
    // Remove the html div for the section from the calendar
    for (let j = 0; j<calSections[index].daySections.length; j++) {
      calSections[index].daySections[j].sectionDiv.remove();
    }
    // Remove the section from the array of scheduled sections
    calSections.splice(index, 1);

    colorClasses();
    crossOutConflicts();
    showScheduleSaveStatus(false);
    // This is inefficient but currently required to get overlaps to un-overlap
    setAllSectionPositions();
  }
}

class CourseSection extends Section {
  constructor(SectionData, code, prefix) {
    super(SectionData, code);
    this.custom = false;
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
    this.location = SectionData.location;
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

    // Display days for which this section meets, as well as location
    let dayText;
    if (typeof this.day == 'string') {
      dayText = this.parsedDay;
    } else {
      dayText = 'No days listed, times:';
    }
    addElement('p', '', sectionDiv, dayText + ' ' +
        this.start_time + '-' + this.end_time + ' in ' + this.location);

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
  schedule() {
    // Creates a div on the calendar for each daySection
    for (let i = 0; i<this.daySections.length; i++) {
      const sectionDiv = this.createCalSection(
          this.code + ': (' + this.id + '), ' +
          this.type + '. ' + this.profList);
      // Make the section draggable
      sectionDiv.setAttribute('draggable', true);
      sectionDiv.addEventListener('dragstart', this.calDragStart);
      sectionDiv.addEventListener('dragend', this.calDragEnd);
      // Add number currently registered to calendar div
      const calnumreg =
          addElement('div', 'calnumreg', sectionDiv, this.number_registered +
          '/' + this.spaces_available);
      // Add registration status
      const registeredIcon = addElement(
          'i', 'fa-solid registeredIcon', calnumreg, '');
      if (this.registered) {
        registeredIcon.classList.add('fa-clipboard-check');
        registeredIcon.title = 'This section is registered';
      } else {
        registeredIcon.classList.add('fa-clipboard');
        registeredIcon.title = 'This section is not registered';
      }

      this.daySections[i].sectionDiv = sectionDiv;
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
    fitCalSectionOverlaps();
    showScheduleSaveStatus(false);
    return true;
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

    this.removeCalSection();

    // Save myClasses because this.scheduled has changed
    saveMyClasses();
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
    // Creates a list of all icons indicating this section's registration status
    // which will all have to be updated based on the new status
    const registeredIcons = [];
    registeredIcons.push(
        this.sectionDiv.getElementsByClassName('registeredIcon')[0]);
    for (const daySection of this.daySections) {
      if (typeof daySection.sectionDiv == 'object') {
        registeredIcons.push(
            daySection.sectionDiv.getElementsByClassName('registeredIcon')[0]);
      }
    }

    if (registered) {
      this.registered = true;
      for (const registeredIcon of registeredIcons) {
        registeredIcon.classList.add('fa-clipboard-check');
        registeredIcon.classList.remove('fa-clipboard');
        registeredIcon.title = 'This section is registered';
      }
      if (!this.pinned) {
        this.pin();
      }
    } else {
      this.registered = false;
      for (const registeredIcon of registeredIcons) {
        registeredIcon.classList.add('fa-clipboard');
        registeredIcon.classList.remove('fa-clipboard-check');
        registeredIcon.title = 'This section is not registered';
      }
    }
  }
}

class CustomSection extends Section {
  constructor(day, start_time, end_time, code) {
    super({
      day: day,
      start_time: start_time,
      end_time: end_time,
    }, code);
    this.custom = true;
  }
  schedule() {
    // Creates a div on the calendar for each daySection
    for (let i = 0; i<this.daySections.length; i++) {
      this.daySections[i].sectionDiv = this.createCalSection(this.code);
      this.daySections[i].sectionDiv.classList.add('calsectionCustom');
      // Clicking the section on the calendar opens a popup to edit it
      this.daySections[i].sectionDiv.addEventListener('click', () =>
        createCustomPopup(this.day, this.start_time, this));
    }

    // Position the newly created div on the calendar based on date/time
    this.position();

    // Add the section to the array of currently scheduled sections
    calSections.push(this);

    saveData('custom', custom, term);

    colorClasses();
    crossOutConflicts();
    fitCalSectionOverlaps();
    showScheduleSaveStatus(false);
    return true;
  }
  unschedule() {
    this.removeCalSection();
    custom.splice(custom.indexOf(this), 1);
    saveData('custom', custom, term);
  }
}

function createCustom(day, start_time, end_time, code) {
  const sect = new CustomSection(day, start_time, end_time, code);
  custom.push(sect);
  saveData('custom', custom, term);
  sect.schedule();
}

function createCustomPopup(day, start_time, existing) {
  const popup = document.getElementById('createCustom');
  popup.style.display = 'flex';
  // Clear fields of previous input
  document.getElementById('label').value = '';
  document.getElementById('end_time').value = '';
  const dayButtons = popup.getElementsByClassName('inputDay');
  for (let i = 0; i<dayButtons.length; i++) {
    // Pre-activate day buttons fed into function, deactivate all others
    if (!day.includes(dayButtons[i].id)) {
      dayButtons[i].classList.remove('active');
    } else {
      dayButtons[i].classList.add('active');
    }
  }
  // Pre-fill input with start time fed into function if one exists
  if (typeof start_time == 'string') {
    document.getElementById('start_time').value = start_time;
  }
  const saveButton = document.getElementById('saveCustom');
  // If this function is called to update an existing custom section,
  // store that section's index in the DOM for use upon completing the popup
  if (typeof existing == 'object') {
    saveButton.dataset.index = custom.indexOf(existing);
    document.getElementById('label').value = existing.code;
    document.getElementById('end_time').value = existing.end_time;
  } else {
    saveButton.dataset.index = -1;
  }
}
const popup = document.getElementById('createCustom');
const dayButtons = popup.getElementsByClassName('inputDay');
for (let i = 0; i<dayButtons.length; i++) {
  dayButtons[i].addEventListener('click', function() {
    dayButtons[i].classList.toggle('active');
  });
}
popup.getElementsByClassName('fa-xmark')[0].addEventListener(
    'click', function() {
      popup.style.display = 'none';
    });
document.getElementById('cancel').addEventListener(
    'click', function() {
      popup.style.display = 'none';
    });

document.getElementById('saveCustom').addEventListener('click', function(e) {
  // Show the user an error if they input an end time before the start time
  const start = getMinutes(document.getElementById('start_time').value) +
      getHours(document.getElementById('start_time').value)*60;
  const end = getMinutes(document.getElementById('end_time').value) +
      getHours(document.getElementById('end_time').value)*60;
  if (document.getElementById('end_time').value == '') {
    alert('You must enter an end time');
    return;
  }
  if (document.getElementById('start_time').value == '') {
    alert('You must enter a start time');
    return;
  }
  if (start >= end) {
    alert('You must enter a start time before the end time');
    return;
  } else if (start < 5*60 || start >= 23*60 || end < 5*60 || end >= 23*60) {
    alert('The selected time is out of bounds');
    return;
  }
  let day ='';
  const dayButtons = popup.getElementsByClassName('inputDay');
  for (let i = 0; i<dayButtons.length; i++) {
    if (dayButtons[i].className.includes('active')) {
      day = day.concat(dayButtons[i].id);
    }
  }
  if (day == '') {
    alert('You must select at least one day for this custom block');
    return;
  }
  // Make a new custom section if createCustomPopup was called without reference
  // to an existing custom section
  if (e.target.dataset.index == '-1') {
    createCustom(
        day,
        document.getElementById('start_time').value,
        document.getElementById('end_time').value,
        document.getElementById('label').value,
    );
  } else {
    // If called to edit an existing section, update that section by replacing
    // it with a newly generated one with the new info
    const index = parseInt(e.target.dataset.index);
    // Remove old sections on calendar
    custom[index].removeCalSection();
    custom[index] = new CustomSection(
        day,
        document.getElementById('start_time').value,
        document.getElementById('end_time').value,
        document.getElementById('label').value,
    );
    custom[index].schedule();
  }
  popup.style.display = 'none';
});

// Add click functionality to the calendar for creating new custom sections
// at that position
const calDay = document.getElementsByClassName('cal-day');
const days = ['U', 'M', 'T', 'W', 'H', 'F', 'S'];
// The first 7 calDays are in the header, not actual time blocks
for (let i = 7; i<calDay.length; i++) {
  calDay[i].addEventListener('dblclick', (e) => {
    e.stopPropagation();
    createCustomPopup(days[i%7], genTime(5*60 + Math.trunc((i-7)/7)*30));
  });
}

// Deep copies a Section object (inputSection) onto sectionToChange
// but skips some properties. This is currently only used in updateBasicInfo()
// so only properties relevant in code after updateBasicInfo()
// and before the page refresh are skipped
// Notably, daySections will lose its references to divs on the calendar
// but it doesn't matter if just used in updating info and refreshing
function mediumCopy(sectionToChange, inputSection) {
  const skip = ['parent', 'scheduled', 'registered', 'pinned', 'sectionDiv'];

  for (const property in inputSection) {
    // Skip if property is from prototype
    if (!inputSection.hasOwnProperty(property)) continue;

    // Skip if the original property needs to be maintained
    // for later code to work
    if (!skip.includes(property)) {
      sectionToChange[property] = inputSection[property];
    }
  }
}

function getMinutes(timeString) {
  return parseInt(timeString.slice(-2));
}
function getHours(timeString) {
  return parseInt(timeString.slice(0, 2));
}
function genTime(minutes) {
  let hours = 0;
  while (minutes >= 60) {
    minutes -= 60;
    hours++;
  }
  const hourString = String(hours).padStart(2, '0');
  const minuteString = String(minutes).padStart(2, '0');
  return hourString + ':' + minuteString;
}

function displayLoadingStatus(done) {
  const loading = document.getElementById('loadingOverlay');
  if (!done) {
    loading.style.display = 'flex';
  } else {
    loading.style.display = 'none';
  }
}

async function webRegTermSelect(term) {
  try {
    return await fetch('https://my.usc.edu/portal/oasis/webregbridge.php', {method: 'GET'})
        .then(async function() {
          const termSelectURL = 'https://webreg.usc.edu/Terms/termSelect?term=' +
          encodeURIComponent(term.number);
          return await fetch(termSelectURL, {method: 'GET'})
              .then((response) => {
                if (response.url == 'https://webreg.usc.edu/close') {
                  displayLoginStatus(false);
                  return false;
                } else if (response.url == 'https://webreg.usc.edu/Departments' ||
                    response.url == 'https://webreg.usc.edu/msg') {
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
  return await webRegTermSelect(term)
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
                return data;
              });
        }
      });
}
async function getCourseBinAsSchedule() {
  return await getCourseBin()
      .then((data) => scheduleFromParsedBin(data.Data));
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
  } else if (element.Scheduled == 'Block') {
    element.custom = true;
    element.code = element.Title;
    const startParen1 = element.Start.indexOf('(');
    const startParen2 = element.Start.indexOf(')');
    const start = new Date(
        parseInt(element.Start.slice(startParen1+1, startParen2)));
    element.start_time = genTime(start.getHours()*60 + start.getMinutes());
    const endParen1 = element.End.indexOf('(');
    const endParen2 = element.End.indexOf(')');
    const end = new Date(
        parseInt(element.End.slice(endParen1+1, endParen2)));
    element.end_time = genTime(end.getHours()*60 + end.getMinutes());
    element.day = dayNumToLetter(start.getDay());
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
    if (!courseBin[i].custom) {
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
    } else {
      sections.push({
        custom: courseBin[i].custom,
        code: courseBin[i].code,
        day: courseBin[i].day,
        start_time: courseBin[i].start_time,
        end_time: courseBin[i].end_time,
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

// Pulls coursebin then tries to find a section matching the input parameters,
// then returns it. Used to retrieve the USC-assigned TaskID and USCID
async function findTaskUserID(code, start_time, end_time, day) {
  return await getCourseBin()
      .then((data) => data.Data.filter((e) =>
        e.code == code &&
        e.start_time == start_time &&
        e.end_time == end_time &&
        e.day == day)[0]);
}

// Creates a custom user time block in the USC webreg calendar
async function scheduleCustomCourseBin(code, start_time, end_time, day) {
  const baseUrl = 'https://webreg.usc.edu/Scheduler/Create';
  const selection = new FormData();
  selection.append('TaskID', '0');
  selection.append('Title', code);
  selection.append('Start', genCourseBinDate(start_time, day));
  selection.append('End', genCourseBinDate(end_time, day));
  selection.append('IsAllDay', 'false');

  return await fetch(baseUrl, {method: 'POST', body: selection})
      .then((response) => response.json())
      .then((data) => {
        if (data.Data[0].Title == code) {
          return true;
        } else {
          throw new Error('Could not schedule custom section');
        }
      });
}
// Unschedules a custom user time block in the USC webreg calendar
async function unscheduleCustomCourseBin(code, start_time, end_time, day) {
  const baseUrl = 'https://webreg.usc.edu/Scheduler/Destroy';
  const selection = new FormData();
  const section = await findTaskUserID(code, start_time, end_time, day);
  selection.append('TaskID', section.TaskID);
  selection.append('USCID', section.USCID);
  selection.append('Title', code);
  selection.append('TERM', term.number);
  selection.append('Scheduled', 'Block');
  selection.append('Start', genCourseBinDate(start_time, day));
  selection.append('End', genCourseBinDate(end_time, day));
  selection.append('IsAllDay', 'false');

  return await fetch(baseUrl, {method: 'POST', body: selection})
      .then((response) => response.json())
      .then((data) => {
        if (data.Data[0].Title == code) {
          return true;
        } else {
          throw new Error('Could not unschedule custom section');
        }
      });
}
// Take in a time string (ex '13:00') and day (ex 'M') and return an ISO-format
// string for that time and day this week - the format used by USC webreg
function genCourseBinDate(time, day) {
  // Make a Date in this week, then adjust the day of the week to match
  // the inputted custom section
  const date = new Date();
  const dayNum = dayLetterToNum(day);
  while (date.getDay() > dayNum) {
    date.setDate(date.getDate()-1);
  }
  while (date.getDay() < dayNum) {
    date.setDate(date.getDate()+1);
  }
  date.setHours(getHours(time));
  date.setMinutes(getMinutes(time));
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date.toISOString();
}
function dayLetterToNum(day) {
  if (day == 'U') {
    return 0;
  } else if (day == 'M') {
    return 1;
  } else if (day == 'T') {
    return 2;
  } else if (day == 'W') {
    return 3;
  } else if (day == 'H') {
    return 4;
  } else if (day == 'F') {
    return 5;
  } else if (day == 'S') {
    return 6;
  }
}
function dayNumToLetter(day) {
  if (day == 0) {
    return 'U';
  } else if (day == 1) {
    return 'M';
  } else if (day == 2) {
    return 'T';
  } else if (day == 3) {
    return 'W';
  } else if (day == 4) {
    return 'H';
  } else if (day == 5) {
    return 'F';
  } else if (day == 6) {
    return 'S';
  }
}

function deptFromCode(code) {
  const hyphen = code.indexOf('-');
  return code.slice(0, hyphen);
}

async function searchDept(dept, term) {
  document.getElementById('loading').style.display = 'block';

  const url = 'https://web-app.usc.edu/web/soc/api/classes/' +
    encodeURIComponent(dept) + '/' + encodeURIComponent(term.number);

  return await fetch(url)
      .then(async function(response) {
        const response2 = response.clone();
        return await response.text().then(async function(data) {
          // If the department doesn't exist (user made a typo) USC API will
          // respond with an error message html
          // Return false if it doesn't exist, otherwise return the data as json
          if (data.includes('ERROR')) {
            return false;
          } else {
            return await response2.json();
          }
        });
      });
}

// Searches for a class matching given dept and code, then adds it to myClasses
async function searchAddClass(dept, term, code) {
  displayLoadingStatus(false);
  return await searchDept(dept, term).then((data) => {
    if (data) {
      for (let i=0; i<data.OfferedCourses.course.length; i++) {
        const currentCourse =
            new Course(data.OfferedCourses.course[i].CourseData);
        if (currentCourse.code == code) {
          currentCourse.add();
        }
      };
      displayLoadingStatus(true);
    } else {
      alert('Error pulling info for: ' + code);
      displayLoadingStatus(true);
      throw new Error('Could not find a matching department');
    }
  });
}

function showSearchedCourses(data, dept) {
  for (let i = 0; i<data.OfferedCourses.course.length; i++) {
    // Check that the course actually belongs in this search
    // (because USC's API will return all courses connected to a department,
    // even if they don't match the prefix
    // i.e. QBIO-401 will show up when searching for BISC courses
    // Webreg's own search only shows courses that match the prefix exactly)
    if (data.OfferedCourses.course[i].CourseData.prefix == dept) {
      new Course(data.OfferedCourses.course[i].CourseData).createHTML(
          document.getElementById('searchResultsContainer'), 'search');
    }
  }
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
  await saveData('classes', noncircular, term);
}

function saveSchedule(name) {
  if (name == '') {
    alert('Your schedule must have a name');
    return;
  }
  const sections = [];
  for (let i=0; i<calSections.length; i++) {
    const section = {};
    section.prefix = calSections[i].prefix;
    section.code = calSections[i].code;
    section.id = calSections[i].id;
    section.custom = calSections[i].custom;
    if (calSections[i].custom) {
      section.start_time = calSections[i].start_time;
      section.end_time = calSections[i].end_time;
      section.day = calSections[i].day;
    }
    sections.push(section);
  }
  // If there already exists a schedule with that name, overwrite it
  for (let i=0; i<schedules.length; i++) {
    if (schedules[i].name==name) {
      if (confirm(
          'A saved schedule with that name already exists, overwrite it?')) {
        schedules[i].sections = sections;
        saveData('schedules', schedules, term);
        showScheduleSaveStatus(true);
      }
      return;
    }
  }
  // If a schedule with that name doesn't exist, this will be reached
  // and the new schedule will be pushed
  schedules.push({name: name, sections: sections});
  saveData('schedules', schedules, term);
  showScheduleSaveStatus(true);
  // Update schedule list dropdown
  createScheduleList();
}

function deleteSchedule(name) {
  const index = schedules.findIndex((e) => e.name == name);
  if (index != -1) {
    schedules.splice(index, 1);
    saveData('schedules', schedules, term);
    if (document.getElementById('schedinput').value == name) {
      document.getElementById('schedinput').value = '';
      showScheduleSaveStatus(false);
    }
    createScheduleList();
    return true;
  } else return false;
}

// Unschedules current schedule and loads the given
// schedule[] where each element has {prefix, code, id}
async function loadSchedule(schedule) {
  unscheduleAll();
  // Iterate through each section in the schedule
  for (let i=0; i<schedule.sections.length; i++) {
    if (!schedule.sections[i].custom) {
      let index = containsClass(classes, schedule.sections[i].code);
      // If the class is not in myClasses, add it and update the index
      if (index == -1) {
        await searchAddClass(
            schedule.sections[i].prefix, term, schedule.sections[i].code);
        index = classes.length-1;
      }
      // Find the section matching the ID and schedule it
      classes[index].SectionData.filter(
          (e) => e.id == schedule.sections[i].id)[0].schedule();
    } else {
      // Create the custom section if it doesn't closely match one
      // that already exists
      if (custom.findIndex((e) =>
        e.code == schedule.sections[i].code &&
        e.day.includes(schedule.sections[i].day) &&
        e.start_time == schedule.sections[i].start_time &&
        e.end_time == schedule.sections[i].end_time) == -1) {
        createCustom(
            schedule.sections[i].day,
            schedule.sections[i].start_time,
            schedule.sections[i].end_time,
            schedule.sections[i].code,
        );
      }
    }
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
      showScheduleSaveStatus(true);
    });
    // Add button to delete this saved schedule
    const deleteButton =
        addElement('i', 'fa-solid fa-xmark iconButton', listEntry, '');
    deleteButton.addEventListener('click', function(e) {
      e.stopPropagation();
      deleteSchedule(schedules[i].name);
    });
  }
}

function showScheduleSaveStatus(saved) {
  const saveSchedButton = document.getElementById('savesched');
  if (saved) {
    saveSchedButton.classList.add('fa-check');
    saveSchedButton.classList.remove('fa-floppy-disk');
  } else {
    saveSchedButton.classList.remove('fa-check');
    saveSchedButton.classList.add('fa-floppy-disk');
  }
}

function showAllScheduled() {
  for (let i = 0; i<classes.length; i++) {
    for (let j = 0; j<classes[i].SectionData.length; j++) {
      if (classes[i].SectionData[j].scheduled) {
        classes[i].SectionData[j].schedule();
      }
    }
  }
  for (let i = 0; i<custom.length; i++) {
    custom[i].schedule();
  }
}

function setAllSectionPositions() {
  for (let x = 0; x<calSections.length; x++) {
    calSections[x].position();
  }
  fitCalSectionOverlaps();
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
  const dayOffset = dayLetterToNum(day);
  const cellRect = calDay[timeOffset+dayOffset].getBoundingClientRect();

  const top = cellRect.y - calDay[7+dayOffset].getBoundingClientRect().y +
        headerRect.height;
  const height = cellRect.height / 30 *
        ((endHours-startHours)*60 + endMinutes-startMinutes);

  div.style.top = top.toString() + 'px';
  div.style.height = height.toString() + 'px';

  // Subtracting 0.75 usually causes the div to be flush with the
  // underlying day border at typical resolutions
  div.style.left = (cellRect.x - timeRect.x -0.75).toString() + 'px';
  div.style.width = (0.95*cellRect.width).toString() + 'px';
}

function fitCalSectionOverlaps() {
  const divs = [];
  calSections.forEach((section) => {
    section.daySections.forEach((daySection) => {
      divs.push(daySection);
    });
  });
  fitOverlaps(divs);
}

function fitOverlaps(divs) {
  divs.forEach((div) => {
    delete div.widthDenom;
  });
  divs.forEach((div) => {
    // Holds all divs that overlap with current div
    let overlaps = [];

    // Sets a base width denominator of 1 for this div, if one is not set
    if (typeof div.widthDenom == 'undefined') {
      div.widthDenom = 1;
    }
    const origWidth = parseFloat(div.sectionDiv.style.width);

    divs.forEach((section2) => {
      // Skips checking for overlaps of a section with itself
      if (div == section2) return;
      // Sets a base width denominator of 1 for this div, if one is not set
      if (typeof section2.widthDenom == 'undefined') {
        section2.widthDenom = 1;
      }
      // Checks if div2 overlaps with div1
      // and if so adds 2 to the overlap array
      if (rectOverlap(div.sectionDiv, section2.sectionDiv)) {
        overlaps.push(section2);
      }
    });

    // Adjusts width and left-offset of given div, based on widthDenom value
    function adjustWidth(adjustSect) {
      adjustSect.widthDenom++;
      adjustSect.sectionDiv.style.width =
          (origWidth/adjustSect.widthDenom).toString() + 'px';
      if (adjustSect.sectionDiv != div.sectionDiv) {
        adjustSect.sectionDiv.style.left =
            parseFloat(adjustSect.sectionDiv.style.left) +
            parseFloat(adjustSect.sectionDiv.style.width) + 1 + 'px';
      }
    }
    // Decreases width of overlapping sections and pushes them to the right
    // until no overlaps remain (for this iteration of section)
    while (overlaps.length>0) {
      const temp = overlaps;
      overlaps = [];
      adjustWidth(div);
      temp.forEach((tempSect) => {
        if (tempSect.widthDenom<div.widthDenom) {
          adjustWidth(tempSect);
        }
        if (rectOverlap(div.sectionDiv, tempSect.sectionDiv)) {
          overlaps.push(tempSect);
        }
      });
    }
  });
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
      possibleSections.push(new CourseSection(course.SectionData[i]));
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
  const divs = [];
  // Adjusts for div variable placement based on whether this unique time
  // has multiple sections or just one
  unique.forEach((element) => {
    if (element.daySections.length==1) {
      divs.push({sectionDiv: element.daySections[0].sectionDiv});
    } else {
      divs.push({sectionDiv: element.div});
    }
  });
  fitOverlaps(divs);
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
    '#1abc9c', // Purple
    '#5bc0de', // Green turquoise
    '#b178aa', // Sky blue
    '#fc6404', // Orange
    '#fcd444', // Mustard yellow
    '#fc4444',
    '#f978aa',
    '#8cc43c',
    '#2f64c1',
    '#029658',
  ];
  // Finds how many distinct classes are scheduled
  const schedClasses = [];
  for (let i = 0; i<calSections.length; i++) {
    if (!schedClasses.includes(calSections[i].code) && !calSections[i].custom) {
      schedClasses.push(calSections[i].code);
    }
  }
  // Goes through the scheduled sections and colors them by class
  for (let i = 0; i<calSections.length; i++) {
    let color;
    // If the section is a custom section, color it gray
    // Otherwise use the array of unique classes to assign it the unique color
    // for its class
    if (calSections[i].custom) {
      color = '#c1c1c1';
    } else {
      color = colors[schedClasses.findIndex((e) => e==calSections[i].code)];
    }
    for (let j = 0; j<calSections[i].daySections.length; j++) {
      calSections[i].daySections[j].sectionDiv.style.background = color;
    }
  }
}

function crossOutConflicts() {
  for (let i=0; i<classes.length; i++) {
    for (let j=0; j<classes[i].SectionData.length; j++) {
      const slashIconArr = classes[i].SectionData[j].sectionDiv
          .getElementsByClassName('fa-slash');
      if (classes[i].SectionData[j].conflicts().length>0 &&
          !classes[i].SectionData[j].scheduled) {
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

    await saveData('lastRefresh', lastRefresh, term);
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
    try {
      await searchDept(depts[i], term)
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
                        mediumCopy(classes[j].SectionData[l], matches[0]);

                      // If the section no longer has a match in
                      // USC schedule of classes, add it to the
                      // list of sections to be deleted
                      } else if (matches.length==0) {
                        toDelete.push(classes[j].SectionData[l]);
                      } else {
                        throw new Error(
                            'Unexpected class data received from USC');
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
                        classes[j].SectionData.push(
                            currentCourse.SectionData[l]);
                      }
                    }
                  }
                }
              }
            }
          });
    } catch (error) {
      alert('Error updating info for ' + depts[i] + ' classes');
    }
  }
}

async function updateUniqueInfo(term) {
  // Get courseBin schedule
  const courseBinSched = await getCourseBinAsSchedule();
  // Add all missing classes
  for (let i = 0; i<courseBinSched.sections.length; i++) {
    if (!courseBinSched.sections[i].custom) {
      if (containsClass(classes, courseBinSched.sections[i].code) == -1) {
        // If the class is not in myClasses, search for its data and add it
        await searchAddClass(courseBinSched.sections[i].prefix, term,
            courseBinSched.sections[i].code);
      }
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
let term;
const classes = [];
const custom = [];
let schedules = [];
let lastRefresh;
chrome.storage.local.get(
    ['term', 'classes', 'custom', 'schedules', 'lastRefresh', 'firstTime'],
    (data) => {
      if (typeof data.term == 'undefined') {
        termSelect();
      } else {
        term = data.term;
        document.getElementById('termButtonText').innerHTML = term.name;

        if (typeof data.classes != 'undefined') {
          let termClasses =
              data.classes.filter((e) => e.term.number == term.number);
          if (termClasses.length == 1) {
            termClasses = termClasses[0].classes;
          }
          for (let i = 0; i<termClasses.length; i++) {
            classes.push(new Course(termClasses[i]));
          }
        }
        if (typeof data.custom != 'undefined') {
          let termCustom =
              data.custom.filter((e) => e.term.number == term.number);
          if (termCustom.length == 1) {
            termCustom = termCustom[0].custom;
          }
          for (let i = 0; i<termCustom.length; i++) {
            custom.push(new CustomSection(
                termCustom[i].day, termCustom[i].start_time,
                termCustom[i].end_time, termCustom[i].code));
          }
        }
        if (typeof data.schedules != 'undefined') {
          termSchedules =
              data.schedules.filter((e) => e.term.number == term.number);
          if (termSchedules.length == 1) {
            schedules = termSchedules[0].schedules;
          }
        }

        showMyClasses();
        createScheduleList();
        showAllScheduled();
        loginTest();
        if (typeof data.lastRefresh != 'undefined') {
          lastRefresh =
              data.lastRefresh.filter((e) => e.term.number == term.number);
          if (lastRefresh.length == 1) {
            lastRefresh = lastRefresh[0].lastRefresh;
          }
        }
        // Show last time class info was refreshed
        if (typeof lastRefresh == 'undefined') {
          document.getElementById('last').innerHTML = 'Last: never';
        } else {
          document.getElementById('last').innerHTML = 'Last: ' + lastRefresh;
        }

        // Show first time welcome if this is the user's first time
        if (typeof data.firstTime == 'undefined') {
          document.getElementById('firstTimeCarousel').style.display = 'flex';
          chrome.storage.local.set({'firstTime': false});
        }
      }
    });


// Adds search listener to dept search box
const input = document.getElementById('input');
input.addEventListener('keypress', async function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const dept = event.target.value.toUpperCase();
    // Clear any previous search results
    document.getElementById('searchResultsContainer').innerHTML = '';
    try {
      const success = await searchDept(dept, term);
      if (success) {
        showSearchedCourses(success, dept);
      } else {
        alert('Could not find classes matching that department, ' +
        'please make sure it is spelled correctly');
      }
    } catch (error) {
      console.error(error);
      alert(error);
    }
    // Hide loading indicator now that search has either completed or failed
    document.getElementById('loading').style.display = 'none';
  }
});

// Makes it so that clicking the schedules dropdown button shows/hides dropdown
const button = document.getElementById('scheddropdownbutton');
button.addEventListener('click', function() {
  const schedinput = document.getElementById('schedinput');
  toggleShow(schedinput.nextElementSibling);
  schedinput.style.borderBottomLeftRadius =
      schedinput.style.borderBottomLeftRadius == '' ? '0rem' : '';
  // Toggles button appearance to either up or down arrow
  button.classList.toggle('fa-chevron-down');
  button.classList.toggle('fa-chevron-up');
});

// Add save schedule functionality to "save schedule" button
// Takes the name of the new schedule from dropdown input box
document.getElementById('savesched').addEventListener('click', function() {
  saveSchedule(document.getElementById('schedinput').value);
});

// Clear the saved indicator if the user changes the text inside
// the save schedule bar
document.getElementById('schedinput')
    .addEventListener('keyup', function(event) {
      if (event.key != 'Enter') {
        showScheduleSaveStatus(false);
      }
    });

// Save schedule if user presses Enter key inside save schedule input box
document.getElementById('schedinput')
    .addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveSchedule(event.target.value);
      }
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
  webRegTermSelect(term);
}

document.getElementById('loginStatus').addEventListener(
    'click', function() {
      loginTest();
    });

// Gets parsed courseBin schedule from getCourseBinAsSchedule(), then
// loads the schedule using loadSchedule(),
// and also sets registration info for those classes that are registered
async function loadCourseBin() {
  displayLoadingStatus(false);
  try {
    const courseBinSched = await getCourseBinAsSchedule();
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
  try {
    const courseBinSched = await getCourseBinAsSchedule();

    for (section of courseBinSched.sections) {
      // If the section in the CourseBin
      // is not in the current schedule being pushed
      if (!section.custom) {
        if (calSections.filter((e) => e.id == section.id).length == 0) {
          await unscheduleCourseBin(section.id);
        }
      } else {
        if (calSections.filter((e) => e.code == section.code &&
        e.start_time == section.start_time &&
        e.end_time == section.end_time &&
        e.day.includes(section.day)).length == 0) {
          await unscheduleCustomCourseBin(
              section.code, section.start_time, section.end_time, section.day);
        }
      }
    }

    for (section of calSections) {
      if (section.custom) {
        for (let i = 0; i<section.daySections.length; i++) {
          // If the daySection is not already present in the CourseBin schedule
          if (courseBinSched.sections.filter((e) =>
            e.code == section.code &&
            e.start_time == section.start_time &&
            e.end_time == section.end_time &&
            e.day == section.daySections[i].day).length == 0) {
            await scheduleCustomCourseBin(
                section.code, section.start_time,
                section.end_time, section.daySections[i].day);
          }
        }
      } else {
        // If the section is not already present in the CourseBin schedule
        if (courseBinSched.sections.filter(
            (e) => e.id == section.id).length == 0) {
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
    }
    notification('success', 'Successfully pushed your schedule to CourseBin');
  } catch (error) {
    console.error(error);
    alert('Error pushing your schedule to CourseBin');
  }
  displayLoadingStatus(true);
}

document.getElementById('pushCourseBin').addEventListener(
    'click', function() {
      pushToCourseBin();
    });

// Finds all occurrences of a given substring and returns their indexes
function indexesOf(string, substring) {
  const matches = [];
  let i = -1;
  while ((i = string.indexOf(substring, i + 1)) >= 0) {
    matches.push(i);
  }
  return matches;
}

async function termSelect() {
  const overlay = document.getElementById('termSelect');
  overlay.style.display = 'flex';
  const spinner = overlay.getElementsByClassName('fa-spinner')[0];
  spinner.style.display = 'block';
  const termSelectLogin = document.getElementById('termSelectLogin');
  termSelectLogin.style.display = 'none';

  if (typeof term != 'undefined') {
    overlay.getElementsByClassName('fa-xmark')[0].style.display = 'block';
  }

  const terms = await fetch('https://my.usc.edu/portal/oasis/webregbridge.php', {method: 'GET'})
      .then((response) => response.text())
      .then((data) => {
        if (data.includes('Your session has ended')) {
          return false;
        }
        // Extracts current term names and numbers from webreg HTML
        const terms = [];
        const substring = '<li><a href="/Terms/termSelect?term=';
        const indexes = indexesOf(data, substring);
        for (let i = 0; i<indexes.length; i++) {
          indexes[i] += substring.length;
        }
        indexes.forEach((index) => {
          const begin = index;
          while (data[index] != '"') {
            index++;
          }
          const endNumber = index;
          while (data[index] != '>') {
            index++;
          }
          const beginName = index + 1;
          while (data[index] != 'C') {
            index++;
          }
          const end = index - 1;
          terms.push({
            number: data.slice(begin, endNumber),
            name: data.slice(beginName, end),
          });
        });
        return terms;
      });

  spinner.style.display = 'none';

  if (!terms) {
    termSelectLogin.style.display = 'block';
  } else {
    const termSelectOptions = document.getElementById('termSelectOptions');
    termSelectOptions.innerHTML = '';
    for (let i=0; i<terms.length; i++) {
      const termButton =
          addElement('button', '', termSelectOptions, terms[i].name);
      termButton.addEventListener('click', function() {
        chrome.storage.local.set({'term': terms[i]})
            .then(location.reload());
      });
    }
  }
  // TODO: Handle errors
}

// Make the refresh button in termSelect() window (upon failure to login)
// cause termSelect() to start again/refresh
document.getElementById('termSelectLogin')
    .getElementsByClassName('fa-arrows-rotate')[0]
    .addEventListener('click', function() {
      termSelect();
    });

// X button in termSelect() closes the term selection popup on click
document.getElementById('termSelect')
    .getElementsByClassName('fa-xmark')[0]
    .addEventListener('click', function() {
      document.getElementById('termSelect').style.display = 'none';
    });

document.getElementById('termButton')
    .addEventListener('click', function() {
      termSelect();
    });

// Saves a value/object to chrome local storage under the given name
// including the currently used term
async function saveData(name, value, term) {
  await chrome.storage.local.get(
      [name], (data) => {
        let existing = data[name];

        if (typeof existing == 'undefined') {
          existing = [{
            term: {number: term.number},
            [name]: value,
          }];
        } else {
          const relevant = existing.filter((e) => e.term.number == term.number);
          if (relevant.length == 1) {
            relevant[0][name] = value;
          } else {
            existing.push({
              term: {number: term.number},
              [name]: value,
            });
          }
        }
        chrome.storage.local.set({[name]: existing});
      });
}

function notification(type, text) {
  const div = addElement('div', 'notification ' + type, document.body, '');

  if (type == 'success') {
    addElement('i', 'fa-solid fa-circle-check status', div, '');
  }

  // Add notification text in the center of the popup
  addElement('p', '', div, text);

  // 'X' button to close notification
  const closeButton = addElement('i', 'fa-solid fa-xmark iconButton', div, '');
  closeButton.addEventListener('click', function() {
    div.remove();
  });

  // Fade in effect
  setTimeout(function() {
    div.style.opacity = '1';
  }, 1);

  // Fade out after a period of time
  setTimeout(function() {
    div.style.opacity = '0';
    setTimeout(function() {
      div.remove();
    }, 500);
  }, 4000);
}

// Moves the carousel one slide right or left
function carousel(direction) {
  const content = document.getElementById('carouselContent').children;

  const origIndex = findCarouselActive();
  let newIndex;
  if (direction == 'right') {
    if (origIndex + 1 < content.length) {
      newIndex = origIndex + 1;
    } else {
      newIndex = 0;
    }
  } else if (direction == 'left') {
    if (origIndex - 1 >= 0) {
      newIndex = origIndex - 1;
    } else {
      newIndex = content.length - 1;
    }
  }

  setCarousel(newIndex, origIndex);
}

// Returns index of the active carousel slide
function findCarouselActive() {
  const content = document.getElementById('carouselContent').children;
  for (let i = 0; i<content.length; i++) {
    if (content[i].className.includes('active')) {
      return i;
    }
  }
}

// Activates the given index slide in the carousel
// and deactivates the old slide
function setCarousel(newIndex, origIndex) {
  const content = document.getElementById('carouselContent').children;
  const indicators = document.getElementById('carouselIndicators').children;
  content[origIndex].classList.remove('active');
  indicators[origIndex].classList.remove('fa-circle');
  indicators[origIndex].classList.add('fa-circle-dot');
  content[newIndex].classList.add('active');
  indicators[newIndex].classList.add('fa-circle');
  indicators[newIndex].classList.remove('fa-circle-dot');
}

document.getElementsByClassName('carouselControl right')[0]
    .addEventListener('click', function() {
      carousel('right');
    });
document.getElementsByClassName('carouselControl left')[0]
    .addEventListener('click', function() {
      carousel('left');
    });

const indicators = document.getElementById('carouselIndicators').children;
for (let i = 0; i<indicators.length; i++) {
  indicators[i].addEventListener('click', function() {
    setCarousel(i, findCarouselActive());
  });
}

// X button in first time welcome closes the popup on click
document.getElementById('firstTimeCarousel')
    .getElementsByClassName('fa-xmark')[0]
    .addEventListener('click', function() {
      document.getElementById('firstTimeCarousel').style.display = 'none';
    });
