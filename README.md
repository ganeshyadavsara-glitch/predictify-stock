# StockPilot AI

Build StockPilot AI, a premium AI-native inventory intelligence platform designed to win a competitive hackathon.

This must NOT look like a normal inventory CRUD application.

The core product idea is:

"Don't just track inventory. Predict inventory problems and tell the business exactly what to do next."

The application should feel like an AI team working behind the scenes for a business owner.

1. CORE EXPERIENCE

The user should be able to open the dashboard and immediately understand:

What is going wrong?

What is likely to go wrong next?

How serious is it?

What action should be taken?

Why is the AI recommending that action?

The primary interaction should be:

"What should I do today?"

The system analyzes the available inventory intelligence and produces a prioritized action plan.

Example:

Reorder Product A — high stockout probability

Discount Product B — high dead-stock risk

Prioritize selling Product C — expiry approaching

Monitor Product D — demand increasing rapidly

Every recommendation must include:

Priority

Product

Problem detected

Evidence

Recommended action

Expected business impact

Do not generate random recommendations.

2. AI MULTI-AGENT ARCHITECTURE

Implement an agent-oriented architecture.

Create a central:

INVENTORY ORCHESTRATOR

The orchestrator receives a user request or dashboard analysis request.

It determines which specialized inventory intelligence modules are required, collects their findings, resolves conflicts, prioritizes recommendations and generates a final business action plan.

Create these specialized agents/modules:

A. INVENTORY HEALTH AGENT

Responsibility:

Current stock analysis

Low stock detection

Critical stock detection

Overstock detection

Days of stock remaining

Inventory health scoring

Input:

current stock

sales velocity

reorder point

inventory value

Output:

health status

risk level

affected SKUs

evidence

B. DEMAND FORECAST AGENT

Responsibility:

Analyze historical sales

Detect demand trends

Estimate near-term demand

Detect accelerating or declining products

Predict potential stockout dates

Output:

forecast

trend

confidence

projected stockout date

explanation

For the hackathon demo, use deterministic forecasting logic if an external AI model is unavailable.

Never fabricate random numbers.

C. SMART REORDER AGENT

Responsibility:

Determine:

whether a product should be reordered

when it should be reordered

how much should be reordered

urgency

Use:

current stock

average daily sales

supplier lead time

reorder point

safety stock

forecast demand

Provide a transparent explanation such as:

"Recommended because current stock covers approximately 3.2 days while supplier lead time is 5 days."

D. DEAD STOCK AGENT

Detect:

products with very low movement

products with no recent movement

capital tied up in slow inventory

overstock risk

Recommend:

discount

promotion

clearance

transfer

stop purchasing

Show estimated capital tied up.

E. EXPIRY RISK AGENT

Detect:

products expiring soon

inventory value at risk

quantities at risk

Group risk into:

Critical: <= 7 days

High: 8–30 days

Medium: 31–60 days

Recommend:

prioritize selling

discount

promotion

transfer

clearance

F. BUSINESS ANALYTICS AGENT

Analyze:

inventory value

stock efficiency

dead-stock value

expiry exposure

stockout exposure

top-performing products

slow-moving products

Generate executive-level insights.

3. AGENT ORCHESTRATION

The specialized agents should not all independently talk to the user.

The orchestration flow should be:

USER QUESTION
↓
INVENTORY ORCHESTRATOR
↓
RELEVANT SPECIALIZED AGENTS
↓
ANALYSIS + EVIDENCE
↓
PRIORITY ENGINE
↓
ACTION PLAN
↓
USER

The final answer should clearly identify:

Problem

What is happening?

Evidence

What data supports it?

Recommendation

What should the business do?

Impact

Why does it matter?

4. AI INVENTORY COPILOT

Create a premium conversational AI interface.

The user can ask:

"What should I do today?"

"Which products are most likely to stock out?"

"Why is Product X risky?"

"What should I reorder?"

"Show me dead stock."

"Which products are about to expire?"

"Which products are selling faster than usual?"

"Where is money tied up?"

"Give me the top 5 inventory actions."

"Explain my inventory health."

The assistant should produce concise, business-oriented responses.

Use structured response cards instead of large walls of text.

Each answer should be traceable to inventory data.

5. AI DECISION CENTER

Create a page called:

AI Decision Center

This is the most important page after the dashboard.

Show:

TODAY'S TOP ACTIONS

Rank recommendations using:

urgency

financial impact

stockout risk

expiry risk

dead-stock value

demand trend

Each recommendation should display:

Priority

Product

Risk

Evidence

Action

Estimated impact

Example:

CRITICAL

Reorder Fresh Milk 1L

Current stock: 42 units

Average daily sales: 18 units

Estimated coverage: 2.3 days

Supplier lead time: 4 days

AI recommendation:
"Place a reorder immediately."

Reason:
"Projected demand exceeds available inventory before the supplier lead time is completed."

6. EXECUTIVE DASHBOARD

Create a premium SaaS dashboard.

Top metrics:

Total Inventory Value

Inventory Health Score

Stockout Risk

Dead Stock Value

Expiry Risk Value

Products Requiring Action

Create an AI summary card:

AI INVENTORY BRIEF

Example:

"Inventory health is 78/100.

7 SKUs are at high stockout risk.
₹1.8L is tied up in slow-moving inventory.
₹42K of inventory is at expiry risk.

The highest-priority action is to reorder 3 critical SKUs and accelerate sales of 4 expiry-risk products."

The numbers must come from demo data and calculations.

7. INVENTORY EXPLORER

Create a professional inventory table.

Columns:

SKU

Product

Category

Current Stock

Daily Sales

Days Remaining

Reorder Point

Supplier

Unit Cost

Selling Price

Margin

Inventory Value

Expiry

AI Status

Statuses:

Healthy

Watch

Low Stock

Critical

Overstock

Dead Stock

Expiring Soon

Add:

search

filters

sorting

category filter

risk filter

Clicking a product opens a detailed intelligence view.

8. PRODUCT INTELLIGENCE PAGE

For every product show:

current stock

historical sales

sales velocity

demand trend

stock coverage

reorder point

supplier lead time

cost

price

margin

expiry date

Add:

WHY IS THIS PRODUCT AT RISK?

The AI should explain the risk using actual product metrics.

Add:

WHAT SHOULD I DO?

Show a recommended action.

9. DEMAND INTELLIGENCE

Create charts for:

historical demand

predicted demand

stock projection

stockout date

Provide:

7-day view

30-day view

Clearly distinguish:

Historical data
vs
Projected data

Include confidence indicators.

10. SMART REORDER CENTER

Create a dedicated reorder page.

For each recommended SKU show:

current stock

average daily sales

days remaining

reorder point

supplier lead time

safety stock

recommended quantity

estimated purchase cost

urgency

explanation

Add:

GENERATE PURCHASE PLAN

Generate a prioritized purchase list.

Do not introduce the previously mentioned ₹50,000 budget feature. The ₹50,000 is the hackathon prize, NOT the application's business budget.

11. DEAD STOCK INTELLIGENCE

Show:

total dead stock value

number of dead SKUs

average days without movement

top dead-stock products

For each product provide an AI recommendation.

12. EXPIRY COMMAND CENTER

Show:

critical expiry items

inventory value at risk

quantity at risk

days until expiry

Provide recommended actions.

13. SUPPLIER INTELLIGENCE

Show:

supplier

products

lead time

reliability

average delivery time

purchase volume

Use supplier information when calculating reorder risk.

14. WHAT-IF SIMULATOR

Create a simple but impressive simulation.

Allow the user to change:

sales growth

supplier delay

safety stock

Then show the effect on:

stockout risk

inventory requirement

reorder requirements

Example:

"If demand increases by 20%, 4 additional SKUs may reach critical stock levels."

Make this visually clear.

15. REALISTIC DEMO DATA

Do NOT create an empty application.

Create at least 40 realistic products.

Categories:

Beverages

Dairy

Snacks

Groceries

Personal Care

Household

Each product must have realistic:

SKU

name

category

stock

daily sales

historical sales

cost

selling price

margin

reorder point

supplier

lead time

expiry date

last movement date

Use Indian Rupees.

Create intentionally different scenarios:

some healthy products

some critical stock

some overstock

some dead stock

some expiry risk

some fast-growing products

some declining products

The dataset must be internally consistent.

16. CALCULATION LOGIC

Use deterministic calculations.

Examples:

Days of Stock

current stock / average daily sales

Stockout Risk

Consider:

days of stock

supplier lead time

forecast demand

reorder point

Dead Stock

Use last movement date and sales velocity.

Expiry Risk

Use days until expiry and inventory value.

Reorder Quantity

Use expected demand during lead time + safety stock - current inventory.

Never use random values.

17. EXPLAINABLE AI

Every important AI recommendation should have an explanation.

Do not simply say:

"Reorder this product."

Instead say:

"Reorder because current stock covers 2.4 days while supplier lead time is 5 days."

This is critical for trust and hackathon judging.

18. DESIGN SYSTEM

Make this look like a premium startup product.

Use:

sophisticated typography

strong spacing

clean cards

polished tables

modern charts

subtle animations

excellent responsive behavior

clear hierarchy

professional iconography

Do NOT make it look like:

a school project

a generic admin template

a simple CRUD dashboard

The UI should feel like an AI operations product.

19. DEMO-FIRST DESIGN

Design the application around a 3-minute hackathon demonstration.

The ideal demo flow:

STEP 1

Open dashboard.

Immediately show:

"7 products at stockout risk."

"₹1.8L dead stock."

"₹42K expiry exposure."

STEP 2

Open AI Decision Center.

Show:

"Today's Top 5 Actions."

STEP 3

Ask AI Copilot:

"What should I do today?"

Show a prioritized action plan.

STEP 4

Click a critical product.

Show the AI explanation and evidence.

STEP 5

Open What-If Simulator.

Increase demand by 20%.

Show newly projected risks.

The demo should tell a clear story:

Detect → Explain → Predict → Recommend → Simulate

20. PRODUCT QUALITY

Implement:

loading states

error states

empty states

confirmation feedback

hover interactions

responsive layouts

accessible controls

consistent navigation

fast-feeling interactions

Avoid unnecessary complexity.

Prioritize polish over the number of pages.

21. HACKATHON DIFFERENTIATION

The application must communicate this concept:

Traditional inventory software:

"What do I have?"

StockPilot AI:

"What is going to happen, why is it happening, and what should I do next?"

Make this difference visible in the product.

22. FINAL IMPLEMENTATION PRINCIPLE

Build the smallest complete system that feels like a real AI inventory intelligence product.

Prioritize:

AI Decision Center

AI Inventory Copilot

Predictive Stockout Detection

Smart Reorder

Dead Stock Intelligence

Expiry Intelligence

Premium Dashboard

What-If Simulation

Do not add random features simply to increase feature count.

The final application should be coherent, believable, polished and impressive in a live hackathon demonstration.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/81ac752f-2112-407c-93c6-5deb52906e1a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
