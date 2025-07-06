// formUtils.js

// Used for dynamic rendering and value handling of forms and XLSForm-like field types

export function getFieldInputHtml(field, value = "") {
  switch (field.type) {
    case "text":
      return `<input type="text" class="form-control" id="f_${field.name}" value="${value||""}">`;
    case "number":
    case "integer":
    case "decimal":
      return `<input type="number" class="form-control" id="f_${field.name}" value="${value||""}" ${field.type==="integer"?'step="1"':''}>`;
    case "date":
      return `<input type="date" class="form-control" id="f_${field.name}" value="${value||""}">`;
    case "select_one":
      return `<select class="form-select" id="f_${field.name}">${(field.choices||"").split(",").map(c=>
        `<option value="${c.trim()}"${value===c.trim()?" selected":""}>${c.trim()}</option>`
      ).join("")}</select>`;
    // Add more field types as needed (e.g., select_multiple, time, note, etc.)
    default:
      return `<input type="text" class="form-control" id="f_${field.name}" value="${value||""}">`;
  }
}

// Parse constraint string (e.g. min=0,max=120)
export function validateFieldConstraint(value, constraint) {
  if (!constraint || !value) return true;
  const rules = constraint.split(",");
  for (let r of rules) {
    const [k,v] = r.split("=");
    if (k==="min" && Number(value) < Number(v)) return false;
    if (k==="max" && Number(value) > Number(v)) return false;
    if (k==="regex" && !(new RegExp(v).test(value))) return false;
  }
  return true;
}
