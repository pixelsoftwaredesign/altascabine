function execute(params) {
  const language = (params && params.language || 'javascript').toLowerCase();
  const task = (params && params.task || 'boilerplate').toLowerCase();
  const componentName = params && params.name || 'PixelComponent';
  let codeSnippet;

  if (['javascript', 'node', 'typescript', 'js', 'ts'].includes(language)) {
    if (task === 'api_endpoint') {
      codeSnippet = `const express = require('express');
const router = express.Router();

router.post('/${componentName.toLowerCase()}', async (req, res) => {
  try {
    const payload = req.body;
    res.status(201).json({ status: 'success', data: payload });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;`;
    } else if (task === 'hexagonal') {
      codeSnippet = `// Hexagonal : port / adapter
class InPort {
  constructor(service) { this.service = service; }
}
class ${componentName}Adapter {
  constructor(port) { this.port = port; }
}
// injectez la dépendance au point de composition (composition root)
module.exports = { InPort, ${componentName}Adapter };`;
    } else {
      codeSnippet = `class ${componentName} {
  constructor(config) {
    this.config = config;
  }

  init() {
    console.log('Initialisation de ${componentName} avec succès.');
  }
}

module.exports = ${componentName};`;
    }
  } else if (language === 'python' || language === 'django') {
    codeSnippet = `from dataclasses import dataclass

@dataclass
class ${componentName}:
    config: dict

    def init(self) -> None:
        print(f"Initialisation de ${componentName} réussie.")`;
  } else if (language === 'flutter' || language === 'dart') {
    codeSnippet = `import 'package:flutter/material.dart';

class ${componentName}Widget extends StatelessWidget {
  const ${componentName}Widget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.0),
      ),
      child: const Text(
        'Pixel Software Design - ${componentName}',
        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
      ),
    );
  }
}`;
  } else {
    codeSnippet = `// Langage non pris en charge ou template par défaut pour ${componentName}`;
  }

  return {
    skill: 'codingSkill',
    status: 'success',
    language,
    generatedCode: codeSnippet
  };
}

module.exports = { execute };