(function () {
    'use strict';

    var ROOT = new URL('.', document.baseURI).href.replace(/\/+$/, '');

    /**
     * The dialogs that are currently on screen, oldest first. The quick-action
     * menu needs to dismiss the dialog it was opened from before it runs the
     * action, so the topmost one has to be reachable from outside.
     */
    var OPEN_DIALOGS = [];

    function say(message) {
        try {
            if (typeof notice === 'function') {
                notice(message);
                return;
            }
        } catch (ignored) {
        }

        console.warn(message);
    }

    function fail(error) {
        say(error && error.message ? error.message : String(error));
    }

    function reloadSoon() {
        setTimeout(function () {
            location.reload();
        }, 900);
    }

    function today() {
        var d = new Date();
        var p = function (n) {
            return String(n).length < 2 ? '0' + n : String(n);
        };

        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    }

    function amount(value) {
        return String(value == null ? '' : value).replace(/[,\s]/g, '');
    }

    function money(value) {
        return 'PKR ' + Number(value || 0).toLocaleString('en-US');
    }

    function rows(list, label) {
        if (!list || !list.length) {
            throw new Error('There are no ' + label + ' to choose from yet');
        }

        return list;
    }

    function options(pairs) {
        return (pairs || []).map(function (pair) {
            return [String(pair[0]), String(pair[1])];
        });
    }

    async function token() {
        var response = await fetch(ROOT + '/api/csrf', {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
        });

        var body = null;

        try {
            body = await response.json();
        } catch (ignored) {
            body = null;
        }

        if (!response.ok || !body || !body.ok || !body.hash) {
            throw new Error('This session could not hand out a CSRF token (HTTP ' + response.status + ')');
        }

        return body;
    }

    async function post(path, payload) {
        var fresh = await token();
        var headers = { 'Content-Type': 'application/json', Accept: 'application/json' };

        headers[fresh.header || 'X-CSRF-TOKEN'] = fresh.hash;

        var response = await fetch(ROOT + path, {
            method: 'POST',
            credentials: 'same-origin',
            headers: headers,
            body: JSON.stringify(payload || {})
        });

        var body = null;

        try {
            body = await response.json();
        } catch (ignored) {
            body = null;
        }

        if (!body) {
            throw new Error('The server did not answer this request with JSON (HTTP ' + response.status + ')');
        }

        if (!body.ok) {
            throw new Error(body.message || ('The server refused this request (HTTP ' + response.status + ')'));
        }

        return body;
    }

    async function get(path) {
        var response = await fetch(ROOT + path, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
        });

        var body = null;

        try {
            body = await response.json();
        } catch (ignored) {
            body = null;
        }

        if (!response.ok || !body || !body.ok) {
            throw new Error((body && body.message) || ('Could not read ' + path + ' (HTTP ' + response.status + ')'));
        }

        return body;
    }

    /**
     * A modal dialog. `spec.fields` entries are
     * { k, l, t, o, v, ph, r, ro } — key, label, type, options, value,
     * placeholder, required, read-only.
     */
    function dialog(spec) {
        return new Promise(function (resolve) {
            var previous = document.activeElement;
            var host = document.createElement('div');

            host.setAttribute('role', 'dialog');
            host.setAttribute('aria-modal', 'true');
            host.setAttribute('aria-label', spec.title);
            host.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;'
                + 'justify-content:center;background:rgba(15,23,42,.55);padding:16px';

            var box = document.createElement('form');

            box.setAttribute('novalidate', 'novalidate');
            box.style.cssText = 'display:grid;gap:12px;width:min(440px,100%);max-height:90vh;overflow:auto;'
                + 'background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:16px;'
                + 'padding:20px;box-shadow:0 24px 60px rgba(2,6,23,.4)';

            var heading = document.createElement('div');

            heading.textContent = spec.title;
            heading.style.cssText = 'font-size:17px;font-weight:800';
            box.appendChild(heading);

            if (spec.note) {
                var note = document.createElement('p');

                note.textContent = spec.note;
                note.style.cssText = 'margin:0;font-size:13px;line-height:1.6;color:var(--muted)';
                box.appendChild(note);
            }

            (spec.fields || []).forEach(function (field) {
                var wrap = document.createElement('label');
                var input;

                wrap.style.cssText = 'display:grid;gap:6px;font-size:12px;font-weight:700;color:var(--muted)';
                wrap.appendChild(document.createTextNode(field.l));

                if (field.t === 'select') {
                    input = document.createElement('select');

                    (field.o || []).forEach(function (option) {
                        var element = document.createElement('option');

                        element.value = String(option[0]);
                        element.textContent = option[1];
                        input.appendChild(element);
                    });
                } else {
                    input = document.createElement('input');
                    input.type = field.t || 'text';
                }

                input.name = field.k;
                input.style.cssText = 'width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:10px;'
                    + 'background:transparent;color:inherit;font-size:14px;font-weight:600';

                if (field.ph) {
                    input.placeholder = field.ph;
                }

                if (field.v !== undefined && field.v !== null) {
                    input.value = String(field.v);
                }

                if (field.ro) {
                    input.readOnly = true;
                }

                if (field.r) {
                    input.required = true;
                }

                wrap.appendChild(input);
                box.appendChild(wrap);
            });

            if (spec.body) {
                var body = document.createElement('div');

                body.style.cssText = 'font-size:13px;line-height:1.7;color:var(--ink)';
                body.innerHTML = spec.body;
                box.appendChild(body);
            }

            var actions = document.createElement('div');

            actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:4px';

            var cancel = document.createElement('button');

            cancel.type = 'button';
            cancel.textContent = spec.cancel || 'Cancel';
            cancel.style.cssText = 'padding:9px 15px;border-radius:10px;border:1px solid var(--line);'
                + 'background:transparent;color:inherit;font-weight:700';

            var submit = document.createElement('button');

            submit.type = 'submit';
            submit.textContent = spec.submit || 'Save';
            submit.style.cssText = 'padding:9px 16px;border-radius:10px;border:0;background:var(--brand);'
                + 'color:#fff;font-weight:800';

            actions.appendChild(cancel);
            actions.appendChild(submit);
            box.appendChild(actions);
            host.appendChild(box);
            document.body.appendChild(host);

            function close() {
                if (host.parentNode) {
                    host.parentNode.removeChild(host);
                }

                var index = OPEN_DIALOGS.indexOf(host);

                if (index > -1) {
                    OPEN_DIALOGS.splice(index, 1);
                }

                document.removeEventListener('keydown', onKey, true);

                if (previous && typeof previous.focus === 'function') {
                    try {
                        previous.focus();
                    } catch (ignored) {
                    }
                }
            }

            function onKey(event) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    close();
                    resolve(null);
                }
            }

            cancel.addEventListener('click', function () {
                close();
                resolve(null);
            });

            host.addEventListener('mousedown', function (event) {
                if (event.target === host) {
                    close();
                    resolve(null);
                }
            });

            box.addEventListener('submit', function (event) {
                event.preventDefault();

                if (spec.readonly) {
                    close();
                    resolve({});
                    return;
                }

                var payload = {};
                var missing = null;

                (spec.fields || []).forEach(function (field) {
                    var element = box.elements[field.k];
                    var value = element ? String(element.value || '').trim() : '';

                    if (field.r && !value && !missing) {
                        missing = field.l;
                    }

                    payload[field.k] = value;
                });

                if (missing) {
                    say(missing + ' is required');
                    return;
                }

                close();
                resolve(payload);
            });

            document.addEventListener('keydown', onKey, true);

            var first = box.querySelector('input,select');

            if (first) {
                try {
                    first.focus();
                } catch (ignored) {
                }
            }

            OPEN_DIALOGS.push(host);

            host.zeeClose = close;
        });
    }

    /**
     * A read-only detail panel. `body` is trusted markup built by the page
     * from data the server already rendered.
     */
    function showDetails(title, body, submitLabel) {
        return dialog({
            title: title,
            body: body,
            fields: [],
            submit: submitLabel || 'Close',
            readonly: true
        });
    }

    var ZEE = {
        /* ------------------------------------------------------- SHARED */

        /**
         * Download a real CSV of this school's own rows.
         */
        exportCsv: function (kind) {
            var link = document.createElement('a');

            link.href = ROOT + '/api/school/export/' + encodeURIComponent(kind || 'students');
            link.rel = 'noopener';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            link.remove();
            say('Export started');
        },

        /**
         * Open a real printable document of this school's own rows.
         */
        printDocument: function (template) {
            var win = window.open(ROOT + '/api/school/print/' + encodeURIComponent(template || 'admission'), '_blank');

            if (!win) {
                say('Allow pop-ups to open the print document');
                return;
            }

            say('Opening ' + (template || 'document'));
        },

        /**
         * Show a detail panel.
         */
        showDetails: showDetails,

        /**
         * Close the dialog that is currently on top. The quick-action menu
         * calls this before it runs the action it was opened from, so the
         * action is not read as part of the dialog.
         */
        closeTopDialog: function () {
            var host = OPEN_DIALOGS[OPEN_DIALOGS.length - 1];

            if (!host) {
                return;
            }

            if (typeof host.zeeClose === 'function') {
                host.zeeClose();

                return;
            }

            if (host.parentNode) {
                host.parentNode.removeChild(host);
            }

            OPEN_DIALOGS.pop();
        },

        /**
         * Show a form dialog and return the payload.
         */
        prompt: dialog,

        /* --------------------------------------------------- SCHOOL WRITE */

        addStudent: async function () {
            try {
                var payload = await dialog({
                    title: 'Add student',
                    fields: [
                        { k: 'first_name', l: 'First name', t: 'text', r: true },
                        { k: 'last_name', l: 'Last name', t: 'text' },
                        { k: 'admission_number', l: 'Admission number', t: 'text', r: true },
                        { k: 'date_of_birth', l: 'Date of birth', t: 'date' },
                        {
                            k: 'gender',
                            l: 'Gender',
                            t: 'select',
                            o: [['', 'Prefer not to say'], ['male', 'Male'], ['female', 'Female'], ['other', 'Other']]
                        }
                    ],
                    submit: 'Add student'
                });

                if (!payload) {
                    return;
                }

                var saved = await post('/api/school/students', payload);

                say(saved.message || 'Student added');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        addStaff: async function () {
            try {
                var payload = await dialog({
                    title: 'Add staff',
                    fields: [
                        { k: 'first_name', l: 'First name', t: 'text', r: true },
                        { k: 'last_name', l: 'Last name', t: 'text' },
                        { k: 'employee_id', l: 'Employee ID', t: 'text', r: true },
                        { k: 'role_type', l: 'Role', t: 'text', r: true }
                    ],
                    submit: 'Add staff'
                });

                if (!payload) {
                    return;
                }

                var saved = await post('/api/school/staff', payload);

                say(saved.message || 'Staff member added');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        recordPayment: async function () {
            try {
                var invoices = rows((await get('/api/school/invoices')).invoices, 'fee invoices');
                var payload = await dialog({
                    title: 'Record payment',
                    fields: [
                        {
                            k: 'invoice_id',
                            l: 'Invoice',
                            t: 'select',
                            r: true,
                            o: invoices.map(function (invoice) {
                                return [
                                    String(invoice.id),
                                    '#' + invoice.id + ' · ' + invoice.fee_head + ' · '
                                        + money(invoice.amount) + ' · ' + invoice.status
                                ];
                            })
                        },
                        { k: 'amount_paid', l: 'Amount received', t: 'number', r: true, ph: '5000' },
                        {
                            k: 'payment_mode',
                            l: 'Payment mode',
                            t: 'select',
                            o: [['cash', 'Cash'], ['bank', 'Bank'], ['cheque', 'Cheque'], ['wallet', 'Wallet']]
                        },
                        { k: 'reference', l: 'Reference', t: 'text', ph: 'Receipt no. / transaction id' }
                    ],
                    submit: 'Record receipt'
                });

                if (!payload) {
                    return;
                }

                payload.amount_paid = amount(payload.amount_paid);

                var saved = await post('/api/school/fees/receipts', payload);

                say(saved.message || 'Receipt recorded');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        newInvoice: async function () {
            try {
                var students = rows((await get('/api/school/students')).students, 'students');

                var payload = await dialog({
                    title: 'New fee invoice',
                    fields: [
                        {
                            k: 'student_id',
                            l: 'Student',
                            t: 'select',
                            r: true,
                            o: students.map(function (student) {
                                return [
                                    String(student.id),
                                    (student.first_name || '') + ' ' + (student.last_name || '') + ' · '
                                        + (student.admission_number || '')
                                ];
                            })
                        },
                        { k: 'fee_head', l: 'Fee head', t: 'text', r: true, ph: 'Tuition fee' },
                        { k: 'amount', l: 'Amount', t: 'number', r: true, ph: '12500' },
                        { k: 'due_date', l: 'Due date', t: 'date' }
                    ],
                    submit: 'Create invoice'
                });

                if (!payload) {
                    return;
                }

                payload.student_id = Number(payload.student_id);
                payload.amount = amount(payload.amount);

                var saved = await post('/api/school/fees/invoices', payload);

                say(saved.message || 'Invoice created');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /**
         * Submit the whole daily register in one request.
         */
        submitAttendance: async function (entries) {
            var list = entries || [];

            if (!list.length) {
                say('There is no student on this register yet');
                return;
            }

            try {
                var saved = await post('/api/school/attendance/batch', {
                    attendance_date: today(),
                    entries: list
                });

                say(saved.message || 'Register submitted');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /* --------------------------------------------------- ACADEMICS */

        newAssessment: async function () {
            try {
                var options = (await get('/api/school/options')).options || {};
                var classes = rows(options.classes, 'classes');
                var subjects = rows(options.subjects, 'subjects');

                var payload = await dialog({
                    title: 'New assessment',
                    fields: [
                        { k: 'exam_name', l: 'Assessment name', t: 'text', r: true },
                        {
                            k: 'class_id',
                            l: 'Class',
                            t: 'select',
                            r: true,
                            o: classes.map(function (item) {
                                return [String(item.id), item.name];
                            })
                        },
                        {
                            k: 'subject_id',
                            l: 'Subject',
                            t: 'select',
                            r: true,
                            o: subjects.map(function (item) {
                                return [String(item.id), item.name];
                            })
                        },
                        { k: 'max_marks', l: 'Maximum marks', t: 'number', r: true, ph: '20' }
                    ],
                    submit: 'Create assessment'
                });

                if (!payload) {
                    return;
                }

                payload.class_id = Number(payload.class_id);
                payload.subject_id = Number(payload.subject_id);
                payload.max_marks = amount(payload.max_marks);

                var saved = await post('/api/school/assessments', payload);

                say(saved.message || 'Assessment created');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        saveMarks: async function (assessmentId, entries) {
            try {
                var saved = await post('/api/school/marks', {
                    assessment_id: Number(assessmentId),
                    entries: entries || []
                });

                say(saved.message || 'Marks saved');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        submitForReview: async function (assessmentId) {
            try {
                var saved = await post('/api/school/assessments/status', {
                    assessment_id: Number(assessmentId),
                    status: 'submitted'
                });

                say(saved.message || 'Sent for review');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        publishAssessment: async function (assessmentId) {
            try {
                var saved = await post('/api/school/assessments/status', {
                    assessment_id: Number(assessmentId),
                    status: 'published'
                });

                say(saved.message || 'Published');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /* ------------------------------------------- TIMETABLE / HOMEWORK */

        addHomework: async function () {
            try {
                var options = (await get('/api/school/options')).options || {};
                var classes = rows(options.classes, 'classes');
                var subjects = rows(options.subjects, 'subjects');

                var payload = await dialog({
                    title: 'Add homework',
                    fields: [
                        { k: 'title', l: 'Title', t: 'text', r: true },
                        {
                            k: 'class_id',
                            l: 'Class',
                            t: 'select',
                            r: true,
                            o: classes.map(function (item) {
                                return [String(item.id), item.name];
                            })
                        },
                        {
                            k: 'subject_id',
                            l: 'Subject',
                            t: 'select',
                            r: true,
                            o: subjects.map(function (item) {
                                return [String(item.id), item.name];
                            })
                        },
                        { k: 'due_date', l: 'Due date', t: 'date' },
                        { k: 'description', l: 'Description', t: 'text' }
                    ],
                    submit: 'Add homework'
                });

                if (!payload) {
                    return;
                }

                payload.class_id = Number(payload.class_id);
                payload.subject_id = Number(payload.subject_id);

                var saved = await post('/api/school/homework', payload);

                say(saved.message || 'Homework added');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        addTimetableEntry: async function () {
            try {
                var options = (await get('/api/school/options')).options || {};
                var classes = rows(options.classes, 'classes');
                var subjects = rows(options.subjects, 'subjects');

                var payload = await dialog({
                    title: 'Add timetable period',
                    fields: [
                        {
                            k: 'class_id',
                            l: 'Class',
                            t: 'select',
                            r: true,
                            o: classes.map(function (item) {
                                return [String(item.id), item.name];
                            })
                        },
                        {
                            k: 'subject_id',
                            l: 'Subject',
                            t: 'select',
                            r: true,
                            o: subjects.map(function (item) {
                                return [String(item.id), item.name];
                            })
                        },
                        {
                            k: 'day_of_week',
                            l: 'Day',
                            t: 'select',
                            r: true,
                            o: [['1', 'Monday'], ['2', 'Tuesday'], ['3', 'Wednesday'], ['4', 'Thursday'],
                                ['5', 'Friday'], ['6', 'Saturday'], ['7', 'Sunday']]
                        },
                        { k: 'start_time', l: 'Start (HH:MM)', t: 'text', r: true, ph: '08:30' },
                        { k: 'end_time', l: 'End (HH:MM)', t: 'text', r: true, ph: '09:20' },
                        { k: 'location', l: 'Room', t: 'text' }
                    ],
                    submit: 'Add period'
                });

                if (!payload) {
                    return;
                }

                payload.class_id = Number(payload.class_id);
                payload.subject_id = Number(payload.subject_id);
                payload.day_of_week = Number(payload.day_of_week);

                var saved = await post('/api/school/timetable', payload);

                say(saved.message || 'Period added');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        addNotice: async function () {
            try {
                var payload = await dialog({
                    title: 'New notice',
                    fields: [
                        { k: 'title', l: 'Title', t: 'text', r: true },
                        { k: 'content', l: 'Notice', t: 'text' },
                        {
                            k: 'audience',
                            l: 'Audience',
                            t: 'select',
                            o: [['all', 'Everyone'], ['students', 'Students'], ['parents', 'Parents'],
                                ['teachers', 'Teachers'], ['staff', 'Staff']]
                        }
                    ],
                    submit: 'Publish notice'
                });

                if (!payload) {
                    return;
                }

                var saved = await post('/api/school/notices', payload);

                say(saved.message || 'Notice created');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /* ----------------------------------------------------- SETTINGS */

        /**
         * Persist the school's own settings.
         */
        saveSettings: async function (payload) {
            try {
                var saved = await post('/api/school/settings', payload || {});

                say(saved.message || 'Settings saved');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /**
         * Mint a real, short-lived connect code for this school and show the
         * scannable QR.
         */
        mintQr: async function () {
            try {
                var invite = await post('/api/connect/invite', {});

                var response = await fetch(invite.qr_url, { credentials: 'same-origin' });
                var blob = await response.blob();
                var url = URL.createObjectURL(blob);

                await showDetails(
                    'Connect code',
                    '<p style="margin:0 0 12px">This code expires at <b>' + invite.expires_at + '</b> '
                        + 'and can be used ' + invite.max_uses + ' time(s).</p>'
                        + '<img src="' + url + '" alt="Connect QR code" style="width:220px;height:220px;'
                        + 'display:block;margin:0 auto;background:#fff;border-radius:12px">',
                    'Done'
                );

                URL.revokeObjectURL(url);
            } catch (error) {
                fail(error);
            }
        },

        /* ------------------------------------------------- SUPER ADMIN */

        addSchool: async function () {
            try {
                var payload = await dialog({
                    title: 'Add school installation',
                    fields: [
                        { k: 'name', l: 'School name', t: 'text', r: true },
                        { k: 'school_code', l: 'School code', t: 'text', r: true }
                    ],
                    submit: 'Provision school'
                });

                if (!payload) {
                    return;
                }

                var created = await post('/api/admin/schools', payload);

                say((created.message || 'School provisioned')
                    + (created.school && created.school.school_code ? ' · ' + created.school.school_code : ''));
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        issueLicense: async function (schoolId) {
            try {
                var schools = rows((await get('/api/admin/schools')).schools, 'school installations');
                var plans = rows((await get('/api/admin/billing/plans')).plans, 'licence plans');
                var wanted = Number(schoolId) || 0;

                if (!wanted && schoolId) {
                    schools.some(function (school) {
                        if (String(school.name) === String(schoolId)) {
                            wanted = Number(school.id);

                            return true;
                        }

                        return false;
                    });
                }

                var payload = await dialog({
                    title: 'Issue licence',
                    fields: [
                        {
                            k: 'school_id',
                            l: 'School',
                            t: 'select',
                            r: true,
                            v: wanted ? String(wanted) : '',
                            o: schools.map(function (school) {
                                return [String(school.id), school.name + ' · ' + (school.school_code || '')];
                            })
                        },
                        {
                            k: 'plan_id',
                            l: 'Plan',
                            t: 'select',
                            r: true,
                            o: plans.map(function (plan) {
                                return [
                                    String(plan.id),
                                    plan.name + (Number(plan.annual_fee) ? ' · ' + money(plan.annual_fee) + ' / year' : '')
                                ];
                            })
                        },
                        { k: 'start_date', l: 'Start date', t: 'date' },
                        { k: 'expires_at', l: 'Expires on', t: 'date' },
                        { k: 'grace_days', l: 'Grace days', t: 'number', ph: '14' }
                    ],
                    submit: 'Issue licence'
                });

                if (!payload) {
                    return;
                }

                var body = {
                    school_id: Number(payload.school_id),
                    plan_id: Number(payload.plan_id)
                };

                if (payload.start_date) {
                    body.start_date = payload.start_date;
                }

                if (payload.expires_at) {
                    body.expires_at = payload.expires_at;
                }

                if (payload.grace_days) {
                    body.grace_days = Number(payload.grace_days);
                }

                var issued = await post('/api/admin/billing/issue', body);

                await dialog({
                    title: 'Licence issued',
                    note: 'Copy this licence key now. It is stored only as a hash, so it cannot be shown again.',
                    fields: [{ k: 'license_key', l: 'Licence key', t: 'text', v: issued.license_key, ro: true }],
                    submit: 'Done'
                });

                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /**
         * Create a real support ticket.
         */
        createTicket: async function () {
            try {
                var schools = (await get('/api/admin/schools')).schools || [];

                var payload = await dialog({
                    title: 'New support ticket',
                    fields: [
                        { k: 'subject', l: 'Subject', t: 'text', r: true },
                        { k: 'body', l: 'Details', t: 'text' },
                        {
                            k: 'school',
                            l: 'School',
                            t: 'select',
                            o: [['', 'Platform level']].concat(schools.map(function (school) {
                                return [String(school.name), String(school.name)];
                            }))
                        },
                        {
                            k: 'priority',
                            l: 'Priority',
                            t: 'select',
                            o: [['Low', 'Low'], ['Normal', 'Normal'], ['High', 'High'], ['Urgent', 'Urgent']]
                        }
                    ],
                    submit: 'Create ticket'
                });

                if (!payload) {
                    return;
                }

                var created = await post('/api/admin/tickets', payload);

                say(created.message || 'Ticket created');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /**
         * Save a negotiated annual fee for one school.
         */
        saveRate: async function (schoolId, fee) {
            try {
                var saved = await post('/api/admin/ratebook', {
                    school_id: Number(schoolId),
                    annual_fee: amount(fee)
                });

                say(saved.message || 'Rate saved');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /**
         * Persist the platform operation switches.
         */
        savePlatformSettings: async function (payload) {
            try {
                var saved = await post('/api/admin/settings', payload || {});

                say(saved.message || 'Platform settings saved');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /**
         * Record a renewal reminder against a school.
         */
        prepareReminder: async function (schoolName) {
            try {
                var saved = await post('/api/admin/reminders', {
                    school: schoolName,
                    note: 'Renewal reminder prepared by the platform workspace'
                });

                say(saved.message || 'Reminder recorded');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /**
         * Record a request for a custom school print design.
         */
        requestCustomTemplate: async function () {
            try {
                var schools = (await get('/api/admin/schools')).schools || [];

                var payload = await dialog({
                    title: 'Request a custom print design',
                    fields: [
                        { k: 'subject', l: 'School', t: 'select', r: true,
                            o: schools.map(function (school) { return [String(school.name), String(school.name)]; }) },
                        { k: 'body', l: 'What is needed', t: 'text', r: true },
                        { k: 'priority', l: 'Priority', t: 'select',
                            o: [['Low', 'Low'], ['Normal', 'Normal'], ['High', 'High'], ['Urgent', 'Urgent']] }
                    ],
                    submit: 'Raise request'
                });

                if (!payload) {
                    return;
                }

                var created = await post('/api/admin/tickets', {
                    subject: 'Custom print design: ' + payload.subject,
                    body: payload.body,
                    school: payload.subject,
                    priority: payload.priority
                });

                say(created.message || 'Request raised');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /* ------------------------------------------- PLATFORM (SUPER ADMIN) */

        /**
         * Download a real CSV of the platform's own control-plane rows.
         */
        exportAdminCsv: function (kind) {
            var link = document.createElement('a');

            link.href = ROOT + '/api/admin/export/' + encodeURIComponent(kind || 'schools');
            link.rel = 'noopener';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            link.remove();
            say('Export started');
        },

        /**
         * Open the real printable specimen of a built-in school document.
         */
        printAdminTemplate: function (template) {
            var win = window.open(ROOT + '/api/admin/print/' + encodeURIComponent(template || 'admission'), '_blank');

            if (!win) {
                say('Allow pop-ups to open the template specimen');
                return;
            }

            say('Opening ' + (template || 'template') + ' specimen');
        },

        /**
         * Price a school-specific quote: the agreed annual fee.
         */
        createQuote: async function (plan) {
            try {
                var schools = rows((await get('/api/admin/schools')).schools, 'school installations');

                var payload = await dialog({
                    title: 'Custom quote' + (plan ? ' · ' + plan : ''),
                    fields: [
                        {
                            k: 'school_id',
                            l: 'School',
                            t: 'select',
                            r: true,
                            o: schools.map(function (school) {
                                return [String(school.id), school.name + (school.school_code ? ' · ' + school.school_code : '')];
                            })
                        },
                        { k: 'annual_fee', l: 'Annual fee (PKR)', t: 'number', r: true, ph: '120000' },
                        { k: 'note', l: 'What is included', t: 'text', ph: 'Licence renewal, one-time setup' }
                    ],
                    submit: 'Save quote'
                });

                if (!payload) {
                    return;
                }

                var saved = await post('/api/admin/quotes', {
                    school_id: Number(payload.school_id),
                    annual_fee: amount(payload.annual_fee)
                });

                say(saved.message || 'Quote saved');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /**
         * Add a separately priced add-on to a school's quote.
         */
        addToQuote: async function (addon) {
            try {
                var schools = rows((await get('/api/admin/schools')).schools, 'school installations');

                var payload = await dialog({
                    title: 'Add to quote · ' + addon,
                    fields: [
                        {
                            k: 'school_id',
                            l: 'School',
                            t: 'select',
                            r: true,
                            o: schools.map(function (school) {
                                return [String(school.id), school.name + (school.school_code ? ' · ' + school.school_code : '')];
                            })
                        }
                    ],
                    submit: 'Add to quote'
                });

                if (!payload) {
                    return;
                }

                var saved = await post('/api/admin/quotes', {
                    school_id: Number(payload.school_id),
                    add_on: addon
                });

                say(saved.message || 'Add-on added to the quote');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /**
         * The real installation health of every school installation.
         */
        openHealthLog: async function () {
            try {
                var rows = (await get('/api/admin/installations')).installations || [];

                await showDetails(
                    'Installation health',
                    rows.length
                        ? rows.map(function (row) {
                            return '<div style="padding:9px 0;border-bottom:1px solid var(--line)"><b>'
                                + row.school + '</b><div style="font-size:12px;color:var(--muted);margin-top:3px">'
                                + (row.code ? row.code + ' · ' : '') + row.state
                                + (row.status ? ' · ' + row.status : '') + ' · ' + row.at + '</div></div>';
                        }).join('')
                        : '<p style="margin:0;color:var(--muted)">No school installation has been provisioned yet.</p>'
                );
            } catch (error) {
                fail(error);
            }
        },

        /**
         * The custom print-design request queue.
         */
        openTemplateRequests: async function () {
            try {
                var requests = (await get('/api/admin/template-requests')).requests || [];

                await showDetails(
                    'Custom print design requests',
                    requests.length
                        ? requests.map(function (row) {
                            return '<div style="padding:9px 0;border-bottom:1px solid var(--line)"><b>'
                                + row.subject.replace('Custom print design: ', '') + '</b><div style="font-size:12px;color:var(--muted);margin-top:3px">'
                                + row.ticket_no + ' · ' + row.school + ' · ' + row.priority + ' · ' + row.status
                                + ' · ' + row.at + '</div></div>';
                        }).join('')
                        : '<p style="margin:0;color:var(--muted)">No custom design has been requested yet.</p>'
                );
            } catch (error) {
                fail(error);
            }
        },

        /**
         * Persist one platform operation switch.
         */
        setPlatformOperation: async function (key, on) {
            try {
                var payload = {};

                payload[key] = !!on;

                var saved = await post('/api/admin/settings', payload);

                say(saved.message || 'Platform setting saved');
                reloadSoon();
            } catch (error) {
                fail(error);
            }
        },

        /* -------------------------------------------------- CONNECT FLOW */

        /**
         * Resolve a school domain or code and send the person to its real
         * sign-in page.
         */
        connectSchool: async function (domain, code) {
            try {
                var body = domain ? { domain: domain } : { code: code };

                var response = await fetch(ROOT + '/api/connect/resolve', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(body)
                });

                var result = await response.json();

                if (!result || !result.found || !result.signin) {
                    say('No school installation matches that domain or code');
                    return;
                }

                window.location.href = result.signin;
            } catch (error) {
                fail(error);
            }
        }
    };

    window.ZEE = ZEE;
}());
