import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const heuristics = [
  {
    name: "Mission-Based Template",
    description:
      "Use this classic SBTM template to create focused test charters. The mission template helps identify risk areas and coverage scope while maintaining flexibility.",
    template: "My mission is to test {risk} for {coverage}",
    elements: { risk: true, coverage: true, time: true, style: false },
    examples: [
      {
        charter: "My mission is to test customers with multiple policies for assessment calculations",
        description: "Test how the system handles complex customer profiles with overlapping policies",
      },
      {
        charter: "My mission is to test users aren't sent multiple notifications for the same event",
        description: "Verify notification deduplication logic works correctly",
      },
      {
        charter: "My mission is to test the payment gateway handles concurrent transactions without data corruption",
        description: "Test concurrent payment processing for race conditions",
      },
    ],
  },
  {
    name: "Exploration-Based Template",
    description:
      "Use this template when you want to focus on discovering information about a specific feature or area. Great for reconnaissance sessions at the start of a project.",
    template: "Explore {target} with {resources} to discover {information}",
    elements: { risk: true, coverage: true, time: true, style: true },
    examples: [
      {
        charter: "Explore the checkout flow with multiple payment methods to discover edge cases",
        description: "Investigate various payment scenarios and their handling",
      },
      {
        charter: "Explore user authentication with expired tokens to discover session handling issues",
        description: "Test token expiration and renewal behavior",
      },
      {
        charter: "Explore the admin panel with different user roles to discover permission boundary issues",
        description: "Find gaps in role-based access control implementation",
      },
    ],
  },
  {
    name: "Fear-Based Charter",
    description:
      "Start with 'I'm afraid that...' to identify potential risks and create charters that focus on preventing negative outcomes. This approach helps testers think like users who might encounter problems.",
    template: "I'm afraid that {risk}... Let's explore {target}",
    elements: { risk: true, coverage: false, time: true, style: true },
    examples: [
      {
        charter:
          "I'm afraid that customer transactions might not be accurately recorded when using the mobile banking feature. Let's explore different transaction scenarios and ensure the system handles them correctly",
        description: "Focus on data integrity during mobile transactions",
      },
      {
        charter:
          "I'm afraid that the payment gateway might not handle unexpected errors gracefully. Let's simulate various error scenarios during checkout and ensure the system provides appropriate error messages",
        description: "Test error handling and user communication",
      },
      {
        charter:
          "I'm afraid that our recent performance optimizations have caused problems in the correctness of our data in large reports. Let's run comprehensive report generation tests",
        description: "Verify data accuracy after performance changes",
      },
    ],
  },
  {
    name: "Curiosity-Based Charter",
    description:
      "Start with 'I'm curious about...' to explore features without specific risk hypotheses. This approach is great for learning about a system and discovering unexpected behaviors.",
    template: "I'm curious about {aspect}... Let's experiment {context}",
    elements: { risk: false, coverage: true, time: true, style: true },
    examples: [
      {
        charter:
          "I'm curious about how the system handles unusual withdrawal patterns. Let's experiment with various withdrawal amounts, frequencies, and timing to understand its behavior",
        description: "Discover system limits and edge cases through experimentation",
      },
      {
        charter:
          "I'm curious about the real-time collaboration feature. Let's simulate multiple users working on the same project simultaneously and observe how the system handles conflicts and updates",
        description: "Explore concurrent editing behavior",
      },
      {
        charter:
          "I'm curious about the onboarding flow for new users. Let's experiment with different registration paths and first-time experiences",
        description: "Understand the new user journey and potential friction points",
      },
    ],
  },
  {
    name: "Coverage × Risk Matrix",
    description:
      "Start with 'What am I testing?' then answer 'What could go wrong?' for each coverage area. This creates a structured approach to identifying test opportunities.",
    template: "What am I testing? {coverage}\nWhat could go wrong? {risk}",
    elements: { risk: true, coverage: true, time: true, style: false },
    examples: [
      {
        charter: "What am I testing? Assessment Calculations\nWhat could go wrong? Customers with multiple policies get incorrect totals",
        description: "Test complex policy calculation scenarios",
      },
      {
        charter: "What am I testing? User registration\nWhat could go wrong? Duplicate email addresses are incorrectly allowed",
        description: "Test data validation and uniqueness constraints",
      },
      {
        charter: "What am I testing? Email notifications\nWhat could go wrong? Users receive emails for actions they didn't perform",
        description: "Test notification triggers and security",
      },
    ],
  },
  {
    name: "Style-Aware Testing",
    description:
      "Consciously consider the testing style to apply. Use positive (confirmatory) or negative (exploratory) approaches, or switch styles during a session to observe different behaviors.",
    template: "Test {target} using {style} approach to verify {expectation}",
    elements: { risk: false, coverage: true, time: true, style: true },
    examples: [
      {
        charter: "Test the login flow using a positive, confirmatory approach to verify it works as specified for valid credentials",
        description: "Basic functionality verification",
      },
      {
        charter:
          "Test the input validation using a negative, exploratory approach to discover what invalid inputs might cause unexpected behavior",
        description: "Hunt for bugs through boundary testing",
      },
      {
        charter:
          "Test the reporting feature using a data-focused style to ensure all calculated values match source data",
        description: "Verify data accuracy comprehensively",
      },
    ],
  },
]

const personas = [
  { heuristicName: "Mission-Based Template", personas: [
    { name: "Regular User", description: "A standard user with typical permissions and usage patterns", characteristics: ["Can perform standard operations", "Limited to own data", "Standard access permissions"] },
    { name: "Admin User", description: "A privileged user with administrative capabilities", characteristics: ["Full system access", "Can modify settings", "Can manage other users"] },
    { name: "Power User", description: "An advanced user who uses complex features and edge cases", characteristics: ["Uses advanced features", "Creates complex data scenarios", "Pushes system boundaries"] },
  ]},
  { heuristicName: "Exploration-Based Template", personas: [
    { name: "Guest User", description: "An unauthenticated user exploring the system", characteristics: ["No login required", "Limited functionality", "First-time visitor perspective"] },
    { name: "New User", description: "A recently registered user going through onboarding", characteristics: ["Learning the system", "Might miss features", "Needs guidance"] },
    { name: "API User", description: "A programmatic user accessing via API", characteristics: ["Machine-to-machine communication", "Automated workflows", "Technical expectations"] },
  ]},
  { heuristicName: "Fear-Based Charter", personas: [
    { name: "Suspicious User", description: "A user concerned about security and data safety", characteristics: ["Alert to anomalies", "Tests boundaries", "Security-conscious"] },
    { name: "Anxious User", description: "A user worried about making mistakes", characteristics: ["Careful with actions", "Checks multiple times", "Needs clear feedback"] },
    { name: "Technical User", description: "A user who understands system internals", characteristics: ["Knows common issues", "Tests edge cases", "Provides detailed feedback"] },
  ]},
  { heuristicName: "Curiosity-Based Charter", personas: [
    { name: "Explorer User", description: "A naturally curious user who tries unexpected things", characteristics: ["Tries unusual paths", "Ignores documentation", "Discovers by accident"] },
    { name: "Researcher", description: "A methodical user who investigates thoroughly", characteristics: ["Systematic approach", "Takes notes", "Documents findings"] },
    { name: "Casual User", description: "A relaxed user with no specific agenda", characteristics: ["Typical usage patterns", "No technical knowledge", "Real-world expectations"] },
  ]},
  { heuristicName: "Coverage × Risk Matrix", personas: [
    { name: "Data Analyst", description: "A user focused on data accuracy and calculations", characteristics: ["Verifies numbers", "Cross-checks data", "Expects precision"] },
    { name: "Compliance Officer", description: "A user ensuring all requirements are met", characteristics: ["Checks all scenarios", "Documents coverage", "Requires evidence"] },
    { name: "Business User", description: "A user focused on business outcomes", characteristics: ["Outcome-oriented", "Understands workflows", "Tests business logic"] },
  ]},
  { heuristicName: "Style-Aware Testing", personas: [
    { name: "QA Tester", description: "A professional tester following test plans", characteristics: ["Follows procedures", "Documents results", "Objective assessment"] },
    { name: "Developer", description: "A developer testing their own code", characteristics: ["Knows internals", "Tests implementation", "Quick feedback loop"] },
    { name: "End User", description: "A real user with authentic usage patterns", characteristics: ["Real-world scenarios", "No special knowledge", "Practical perspective"] },
  ]},
]

async function main() {
  console.log("Seeding heuristics...")

  for (const heuristicData of heuristics) {
    const existing = await prisma.heuristic.findFirst({
      where: { name: heuristicData.name },
    })

    if (existing) {
      console.log(`  Heuristic "${heuristicData.name}" already exists, skipping...`)
      continue
    }

    const heuristic = await prisma.heuristic.create({
      data: {
        name: heuristicData.name,
        description: heuristicData.description,
        template: heuristicData.template,
        elements: heuristicData.elements,
        examples: heuristicData.examples,
      },
    })

    console.log(`  Created heuristic: ${heuristic.name}`)

    const personaData = personas.find((p) => p.heuristicName === heuristicData.name)
    if (personaData) {
      for (const persona of personaData.personas) {
        await prisma.persona.create({
          data: {
            heuristicId: heuristic.id,
            name: persona.name,
            description: persona.description,
            characteristics: persona.characteristics,
          },
        })
      }
      console.log(`    Added ${personaData.personas.length} personas`)
    }
  }

  console.log("Heuristics seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
