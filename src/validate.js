const fs = require("fs")
const f = import("rdf-ext")
const PN3 = import("@rdfjs/parser-n3")
const shacl = import("rdf-validate-shacl")

async function loadDataset(filePath) {
  const ParserN3 = await PN3
  const factory = await f
  const stream = fs.createReadStream(filePath)
  const parser = new ParserN3.default({ factory: factory.default })
  return factory.default.dataset().import(parser.import(stream))
}

/**
 * Validates a file against a given shape.
 * @param {string} shapePath - Path to shape file
 * @param {string} filePath - Path to file to validate
 * @returns {boolean} Validation result
 * @throws {Error} Throws an error if the validation fails
 */
async function validate(shapePath, filePath) {
  const factory = await f
  const SHACLValidator = await shacl

  const shapes = await loadDataset(shapePath)
  const data = await loadDataset(filePath)
  const validator = new SHACLValidator.default(shapes, {
    factory: factory.default,
  })
  const report = validator.validate(data)

  // Check conformance: `true` or `false`
  console.info("Validation result: ", report.conforms) // eslint-disable-line no-console

  let violation = false
  if (report.conforms) {
    return true
  } else {
    for (const result of report.results) {
      // See https://www.w3.org/TR/shacl/#results-validation-result for details
      // about each property
      /* eslint-disable no-console */
      if (result.severity.value === "http://www.w3.org/ns/shacl#Violation") {
        violation = true
        console.error(
          "-----------Violation--------------",
          "\n",
          "Message: ",
          result.message,
          "\n",
          "Path: ",
          result.path.value,
          "\n",
          "Node, where the error occured: ",
          result.focusNode.value,
          "\n",
          "Severity of error: ",
          result.severity.value
        )
      } else {
        console.info(
          "-----------Warning--------------",
          "\n",
          "Message: ",
          result.message,
          "\n",
          "Path: ",
          result.path.value,
          "\n",
          "Node, where the error occured: ",
          result.focusNode.value,
          "\n",
          "Severity of error: ",
          result.severity.value
        )
      }
      /* eslint-enable no-console */
    }

    // Validation report as RDF dataset
    // console.log(report.dataset)
    if (violation)
      return Promise.reject(
        new Error(
          `${filePath} is not valid. \n Validation failed with Violations. See output above.`
        )
      )

    return true
  }
}

module.exports = {
  validate,
}
