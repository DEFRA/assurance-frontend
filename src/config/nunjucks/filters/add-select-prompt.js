/**
 * Adds a prompt option to the start of a select items array
 */
export function addSelectPrompt(items = [], promptText = 'Please select') {
  return [
    {
      text: promptText,
      value: ''
    },
    ...items
  ]
}
