// Lets the Service Report form grow/shrink the "Parts Replaced" table
// without a page reload. New rows get the next free WTForms FieldList
// index; WTForms tolerates gaps left behind by removed rows.
(function () {
    const body = document.querySelector('[data-parts-body]');
    const addButton = document.querySelector('[data-add-part]');
    const template = document.querySelector('[data-part-template]');
    if (!body || !addButton || !template) return;

    let nextIndex = body.querySelectorAll('[data-part-row]').length;

    function addRow() {
        const html = template.innerHTML.replace(/__index__/g, String(nextIndex));
        const row = document.createElement('tr');
        row.setAttribute('data-part-row', '');
        row.innerHTML = html;
        body.appendChild(row);
        nextIndex += 1;
    }

    function onBodyClick(event) {
        const removeButton = event.target.closest('[data-remove-part]');
        if (!removeButton) return;
        const row = removeButton.closest('[data-part-row]');
        if (body.querySelectorAll('[data-part-row]').length > 1) {
            row.remove();
        } else {
            row.querySelectorAll('input').forEach((input) => { input.value = ''; });
        }
    }

    addButton.addEventListener('click', addRow);
    body.addEventListener('click', onBodyClick);
})();
