// The demo document: one node of every type, with real-ish content. Used by
// make-sample.mjs (writes public/sample-content.json for /?src=/sample-content.json)
// and render-check.jsx (SSR sanity). Keep it exercising every type in the library.

const node = (id, parentId, typeKey, name, data, childIds = []) => ({
  id, parentId, childIds, name, facet: 'pages', meta: {},
  settings: { locked: false, lockChildren: false },
  editor: { typeKey, data },
});

export const sampleDocument = {
  rootId: 'root',
  nodes: {
    root: node('root', null, 'activitySet', 'Demo set', {
      title: 'Tufted Titmouse Activities Demo',
      intro: 'Three ported activities: pair things up, slide between ideas, and sort against your own reflexes.',
    }, ['match1', 'slider1', 'sort1']),

    match1: node('match1', 'root', 'matching', 'Matching', {
      title: 'Concept Matching',
      introText: 'Match each concept on the left to its example on the right.',
      sourceLabel: 'Concepts',
      targetLabel: 'Examples',
      pairs: [
        { source: 'Primary Colors', target: 'Red, Blue, Yellow — the fundamental colors that cannot be created by mixing other colors.' },
        { source: 'Renewable Energy', target: 'Solar, Wind, Hydroelectric — energy sources that naturally replenish over time.' },
        { source: 'Programming Languages', target: 'JavaScript, Python, Java — languages used to create software applications.' },
        { source: 'Geometric Shapes', target: 'Triangle, Circle, Square — basic two-dimensional shapes with defined properties.' },
      ],
      shuffleTargets: true,
      successMessage: 'Excellent work! You matched every concept correctly.',
      partialMessage: 'Good effort — review the red pairs and try again.',
    }),

    slider1: node('slider1', 'root', 'compareSlider', 'Compare slider', {
      title: 'Interactive Comparison',
      description: 'Choose a theme, then drag the slider to explore the balance between two ideas.',
      themes: [
        {
          name: 'Creativity vs Structure',
          leftConcept: 'Creative Freedom', rightConcept: 'Organized Structure',
          leftIcon: '🎨', rightIcon: '📋',
          leftColor: '#e74c3c', rightColor: '#3498db',
          left: 'Pure creativity emphasizes innovation, spontaneity, and unlimited artistic expression.',
          center: 'A balanced approach combines creative inspiration with organizational frameworks.',
          right: 'Structured approaches prioritize planning, consistency, and systematic execution.',
        },
        {
          name: 'Speed vs Quality',
          leftConcept: 'Fast Delivery', rightConcept: 'High Quality',
          leftIcon: '⚡', rightIcon: '💎',
          leftColor: '#f39c12', rightColor: '#9b59b6',
          left: 'Rapid execution focuses on quick delivery and immediate results.',
          center: 'Balanced execution achieves good quality within reasonable timeframes.',
          right: 'Quality-focused approaches prioritize excellence and polished outcomes.',
        },
      ],
    }),

    sort1: node('sort1', 'root', 'speedSort', 'Speed sort', {
      title: 'Quick Categorization',
      description: 'Sort each word into the correct category — use the buttons or your arrow keys.',
      rounds: [
        {
          instructions: 'Sort animals into Land or Water categories',
          leftCategory: 'Land Animals', rightCategory: 'Water Animals',
          words: [
            { text: 'Dog', category: 'left' },
            { text: 'Fish', category: 'right' },
            { text: 'Cat', category: 'left' },
            { text: 'Whale', category: 'right' },
            { text: 'Lion', category: 'left' },
            { text: 'Dolphin', category: 'right' },
          ],
        },
        {
          instructions: 'Sort foods into Fruits or Vegetables categories',
          leftCategory: 'Fruits', rightCategory: 'Vegetables',
          words: [
            { text: 'Apple', category: 'left' },
            { text: 'Carrot', category: 'right' },
            { text: 'Banana', category: 'left' },
            { text: 'Broccoli', category: 'right' },
          ],
        },
      ],
    }),
  },
};
