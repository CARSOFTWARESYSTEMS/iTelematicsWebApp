/**
 * Content for /space-station, the Space Station Digital Twin R&D Center. One source for the page,
 * its structured data and its tests. Country-neutral by design: no national programme, policy,
 * roadmap or agency is named. Everything future-facing is labelled as proposed or planned, and every
 * maturity label states only what exists today.
 */
import type { Maturity } from '@/components/site/blocks';
import { SRC_CHANNELS, SRC_CRITICAL_KW, SRC_FAULT, SRC_MARGIN, SRC_NAME } from '@/lib/station-twin/model';
import { signed } from '@/lib/space-twin/story';

export const STATION = {
    center: 'Space Station Digital Twin R&D Center',
    headline: 'Engineering the Intelligence Behind Future Space Stations.',
    identity: ['Physics-Based Modelling', 'Digital Twin Engineering', 'Energy Autonomy', 'Integrated Health Intelligence', 'Mission Assurance'],
    philosophy: ['Understand the System.', 'Model the Physics.', 'Investigate the Behaviour.', 'Verify the Evidence.'],
    vision:
        'To advance the engineering and operational intelligence of future space stations through trusted digital twins that help make orbital infrastructure safer, more resilient, autonomous and sustainable.',
    mission:
        'To research, develop and validate physics-based, data-driven and intelligent digital twin technologies for the design, integration, simulation, health monitoring, fault diagnosis, predictive analysis and operational assurance of space-station systems.',
    horizon: 2047,
} as const;

/** Why a space station needs digital twins: the engineering problem, stated plainly. */
export const WHY_TWINS = [
    {
        title: 'Tightly coupled systems',
        text: 'Power, thermal, life support, avionics and structure share every watt, kilogram and bit. A change in one shows up in the others, often hours later.',
    },
    {
        title: 'Decades of degradation',
        text: 'Arrays lose output, batteries lose capacity and components wear over a service life of 15 years or more. Margins must be tracked, not assumed.',
    },
    {
        title: 'Limited access',
        text: 'Hardware cannot simply be inspected or replaced. Engineers rely on telemetry and models to see what the station is doing and why.',
    },
    {
        title: 'Decisions under time pressure',
        text: 'When a fault occurs, crews and ground teams need trusted predictions of its consequences before they act, not after.',
    },
] as const;

/** How the words are used on this site (and why the station model here is not called a digital twin). */
export const TWIN_TERMS = [
    { term: 'Digital model', text: 'A static or manually updated digital representation of a system.' },
    { term: 'Simulation', text: 'An engineering model that predicts behaviour under defined assumptions.' },
    { term: 'Digital shadow', text: 'A representation updated from measured data, without full two-way synchronisation.' },
    { term: 'Digital twin', text: 'A system-specific, appropriately synchronised and validated representation with a defined engineering purpose.' },
] as const;

export const GOALS = [
    { title: 'Develop modular space-station digital twin architecture.', objective: 'Define a reference architecture, interfaces and data model that let subsystem twins be added one at a time.' },
    { title: 'Build physics-based station subsystem models.', objective: 'Model power, energy storage, thermal, life-support mass balance and structure from first principles, with stated assumptions.' },
    { title: 'Research electrical energy autonomy.', objective: 'Develop energy management that keeps critical loads powered through eclipses, degradation and faults.' },
    { title: 'Advance integrated station health monitoring.', objective: 'Detect, isolate and explain faults across subsystems, with measured detection delay and false-alarm rates.' },
    { title: 'Investigate intelligent and secure station operations.', objective: 'Research decision support, telemetry integrity and secure commanding, without unproven autonomy claims.' },
    { title: 'Enable reproducible scientific experimentation.', objective: 'Publish experiments with hypotheses, assumptions, code and data so others can reproduce or refute them.' },
    { title: 'Establish traceable model validation and mission assurance.', objective: 'Trace each model from requirement to evidence, with credibility, provenance and uncertainty recorded.' },
    { title: 'Build a collaborative engineering research ecosystem.', objective: 'Work with researchers, engineers and organisations on clearly scoped, reviewable research projects.' },
] as const;

/** Proposed milestones: targets for planning, not commitments and not achievements. */
export const MILESTONES = [
    { year: '2027', text: `Publish the ${SRC_NAME} reference architecture and a verified station energy-balance model; run the five flagship energy and health experiments in simulation with reproducible notebooks.` },
    { year: '2029', text: 'Operate a telemetry ingestion and replay service on simulated and hardware-in-the-loop data; couple the power and thermal models; benchmark health-monitoring algorithms with published detection delay and false-alarm rates.' },
    { year: '2032', text: 'Demonstrate a multi-subsystem digital twin (power, energy storage, thermal, life-support mass balance, mass properties) validated against laboratory or collaborator data.' },
    { year: '2035', text: 'Demonstrate station-level health intelligence on representative data with external R&D collaborators, and publish model credibility assessments.' },
    { year: '2047', text: 'Trusted, continuously updated digital twins supporting the design and operation of complex orbital infrastructure, contingent on technical and commercial progress.' },
] as const;

// ── Section C: station systems architecture ─────────────────────────────────

export interface StationSystem {
    id: string;
    number: string;
    name: string;
    purpose: string;
    principles: string;
    models: string;
    interfaces: string;
    telemetry: string;
    dependencies: string;
    questions: string;
    twin: string;
    deliverables: string;
    budgets: string;
}

export const SYSTEMS: readonly StationSystem[] = [
    {
        id: 'mission',
        number: '01',
        name: 'Mission Architecture and Orbital Environment',
        purpose: 'Defines the orbit, service life, crew and research objectives, and the environment every subsystem must survive.',
        principles: 'Requirements flow-down; orbit selection by altitude, inclination and β-angle; atomic oxygen, radiation, micrometeoroids and orbital debris, plasma and thermal cycling; drag and reboost.',
        models: 'Kepler period T = 2π√(a³/μ); two-body propagation with J2 and drag (½ρv²C_D A); eclipse fraction from β-angle and altitude; trapped-radiation dose and debris-flux models.',
        interfaces: 'Every subsystem through the requirements baseline; ground segment; visiting-vehicle traffic model.',
        telemetry: 'Position and velocity, attitude, atmospheric density estimates, radiation dosimetry, conjunction data.',
        dependencies: 'Sets eclipse length for power, sink temperatures for thermal, reboost propellant and communication windows.',
        questions: 'How do β-angle seasons and the solar cycle shape the energy, thermal and propellant budgets across a 15-year life?',
        twin: 'An environment model that feeds every subsystem twin the same orbit, illumination and environment states.',
        deliverables: 'Orbit and environment reference model; β-angle and eclipse season tables; mission requirement baseline.',
        budgets: 'Drives the power budget (eclipse), thermal budget (β-angle, sink temperature) and data budget (contact windows).',
    },
    {
        id: 'structures',
        number: '02',
        name: 'Structural Modules and Station Assembly',
        purpose: 'Provides the pressurised volume and the load path for everything else, assembled in orbit module by module.',
        principles: 'Pressure-vessel design, shielding against micrometeoroids and debris, standard berthing and docking interfaces, assembly sequencing and configuration control, structural dynamics.',
        models: 'Thin-wall hoop stress σ = pr/t; finite-element modes; leak rate through an orifice; mass properties and centre of mass through each assembly stage; fatigue from pressure and thermal cycles.',
        interfaces: 'Truss attachments, docking and berthing mechanisms, utility pass-throughs (power, data, fluids), grapple fixtures.',
        telemetry: 'Cabin pressure and leak checks, strain gauges, accelerometers, hatch and seal states.',
        dependencies: 'Life support holds the pressure; thermal sets shell temperatures; guidance needs the mass properties.',
        questions: 'Can a structural twin track fatigue and leak risk as modules are added and loads change?',
        twin: 'A configuration-aware mass-properties and structural-health model, updated at each assembly stage and docking event.',
        deliverables: 'Module reference architecture; mass-properties model; pressure and leak monitoring algorithm.',
        budgets: 'The largest share of station mass; defines the volume available to crew and research.',
    },
    {
        id: 'solar-power',
        number: '03',
        name: 'Solar Power Generation',
        purpose: 'Converts sunlight into the station’s primary electrical power.',
        principles: 'Photovoltaic conversion; sun tracking with rotary joints; degradation from radiation, thermal cycling and atomic oxygen; shadowing by the station’s own structure.',
        models: 'P = η · A · S · cos θ · (1 − d)ᵗ with S ≈ 1361 W/m²; single-diode I–V curve; temperature coefficients; self-shadowing geometry.',
        interfaces: 'Array regulators and shunts to the primary bus; joint drives; attitude control; array thermal environment.',
        telemetry: 'String currents and voltages, array temperatures, joint angles, Sun vector, shunt states.',
        dependencies: 'Orbit (illumination), attitude (pointing), structure (shadowing), robotics (maintenance).',
        questions: 'Can string-level residuals separate degradation, shadowing and pointing error early enough to protect the energy margin?',
        twin: 'An array performance model compared with string telemetry to estimate degradation and flag channel faults.',
        deliverables: 'Solar generation model with shadowing; string-level residual detector; degradation estimator.',
        budgets: 'Sets the power budget; the arrays dominate external area, which affects drag and attitude control.',
    },
    {
        id: 'power-distribution',
        number: '04',
        name: 'Electrical Power Distribution',
        purpose: 'Regulates, switches, protects and distributes power to every load through independent channels.',
        principles: 'Primary and secondary buses with DC–DC conversion; channelisation for fault tolerance; remote power controllers and current limits; load priority and shedding.',
        models: 'Converter efficiency maps; bus voltage regulation; power flow P = VI with I²R line losses; protection coordination; load-priority tables.',
        interfaces: 'Arrays, batteries and every load; thermal control (converter heat); avionics (commands and protection).',
        telemetry: 'Bus voltages and currents, converter temperatures, switch states, trip events.',
        dependencies: 'Every subsystem is a load; thermal control must remove the converter losses.',
        questions: 'Which load-shedding strategies keep critical systems powered through compound faults while minimising lost research time?',
        twin: 'A channel-level power-flow model that predicts the effect of a fault or reconfiguration before it is commanded.',
        deliverables: 'Electrical power simulation engine; load-priority and shedding logic; reconfiguration what-if tool.',
        budgets: 'Converter losses add to the thermal budget; channel capacity limits the power budget.',
    },
    {
        id: 'battery-storage',
        number: '05',
        name: 'Battery Energy Storage',
        purpose: 'Carries the station through every eclipse, about 5,700 times a year in low Earth orbit, and buffers peak loads.',
        principles: 'Lithium-ion electrochemistry; depth of discharge against cycle life; constant-current, constant-voltage charging with taper; cell balancing; temperature control.',
        models: 'Coulomb counting; equivalent-circuit (Thevenin RC) models; state-of-charge and state-of-health estimation with Kalman filters; capacity fade against cycles, depth of discharge and temperature.',
        interfaces: 'Charge and discharge units on the bus; cold plates and fluid loops; avionics.',
        telemetry: 'Cell and module voltages, currents and temperatures; state of charge; state-of-health estimates; impedance.',
        dependencies: 'Power (charging), thermal (temperature window), orbit (eclipse length).',
        questions: 'How accurately can state of health be estimated in orbit from routine cycling data, and how early can capacity loss be seen?',
        twin: 'A battery digital twin that combines an equivalent-circuit model with ageing laws, recalibrated from telemetry.',
        deliverables: 'Battery energy storage digital twin; SOC and SOH estimator; capacity-loss experiment.',
        budgets: 'A major mass item; depth of discharge sets cycle life; internal resistance adds heat to reject.',
    },
    {
        id: 'thermal-control',
        number: '06',
        name: 'Thermal Control',
        purpose: 'Keeps every component inside its temperature limits by collecting, transporting and rejecting heat.',
        principles: 'Heat balance; passive control (multi-layer insulation, coatings) and active control (pumped fluid loops, cold plates, heat exchangers, radiators, heaters).',
        models: 'Q = εσA(T⁴ − T_sink⁴); lumped thermal networks; fluid loops Q = ṁ c_p ΔT; absorbed solar αSA, albedo and Earth infrared.',
        interfaces: 'Every heat-producing load; life-support heat exchangers; power (pumps and heaters).',
        telemetry: 'Temperatures, loop flow rates, pump speeds, radiator angles, heater states.',
        dependencies: 'Power (pumps and heaters), orbit (β-angle, sink temperature), structure.',
        questions: 'How should loads and radiator pointing be scheduled across β-angle seasons to keep the thermal margin positive?',
        twin: 'A thermal network coupled to the power model: every watt consumed becomes heat to reject.',
        deliverables: 'Thermal network model; coupled power–thermal simulation; radiator sizing study.',
        budgets: 'Mirrors the power budget; radiators are a significant share of mass and external area.',
    },
    {
        id: 'eclss',
        number: '07',
        name: 'Environmental Control and Life Support',
        purpose: 'Provides breathable air, water, temperature and humidity control, and fire detection and suppression for the crew.',
        principles: 'Oxygen generation by electrolysis, carbon-dioxide removal, trace-contaminant control, water recovery, pressure control, fire safety; open and closed loops.',
        models: 'Mass balances for O₂, CO₂ and H₂O per crew member; cabin partial pressures; electrolysis power proportional to oxygen rate; psychrometrics for humidity.',
        interfaces: 'Power (the largest critical load), thermal (heat exchangers), structure (pressure), crew.',
        telemetry: 'O₂ and CO₂ partial pressures, total pressure, humidity, water quality, fan and pump states, smoke detectors.',
        dependencies: 'Highest load priority; depends continuously on power and thermal control.',
        questions: 'How do life-support power demand and loop closure trade against each other, and how early can component degradation be seen?',
        twin: 'A cabin atmosphere mass-balance model that predicts partial pressures and consumables under faults or load shedding.',
        deliverables: 'Cabin atmosphere model; consumables projection; life-support health indicators.',
        budgets: 'The largest critical electrical load; drives consumable mass and crew time.',
    },
    {
        id: 'avionics',
        number: '08',
        name: 'Avionics and Flight Computing',
        purpose: 'Computes, commands, monitors and records station operations, and hosts guidance, control and fault-management software.',
        principles: 'Redundant computers and networks; deterministic real-time software; time synchronisation; radiation-tolerant electronics; software partitioning.',
        models: 'Reliability block diagrams; network latency and throughput; attitude dynamics (Euler’s equations); momentum management for control moment gyroscopes.',
        interfaces: 'Every subsystem through data buses; communications; crew displays.',
        telemetry: 'Processor health, memory error counts, bus traffic, mode states, event logs.',
        dependencies: 'Power (a critical load), thermal control, communications.',
        questions: 'Which onboard health-monitoring functions can be verified to the standard needed for safety-relevant decisions?',
        twin: 'A software-in-the-loop model of station modes and fault-management logic, run against simulated subsystem twins.',
        deliverables: 'Telemetry ingestion and replay service; fault-management logic model; mode-transition simulator.',
        budgets: 'Modest power and mass; sets the data budget and command latency.',
    },
    {
        id: 'communications',
        number: '09',
        name: 'Communications and Ground Systems',
        purpose: 'Carries commands, telemetry, science data, voice and video between the station, the ground and visiting vehicles.',
        principles: 'RF link budgets; relay and direct-to-ground links; low-rate command links and high-rate data links; optical links; link security.',
        models: 'Eb/N₀ = EIRP − L_fs − L_other + G/T − k − 10 log R; free-space loss (4πd/λ)²; coverage and contact windows.',
        interfaces: 'Avionics (data handling), power, thermal, attitude (antenna pointing), ground segment.',
        telemetry: 'Link margin, bit-error rate, antenna pointing, data volume, latency.',
        dependencies: 'Orbit geometry, power, attitude.',
        questions: 'How can telemetry integrity and provenance be guaranteed end to end, so that ground engineers can trust a twin built on it?',
        twin: 'A data-flow model from sensor to ground archive, including latency, gaps and integrity checks.',
        deliverables: 'Telemetry data model; ingestion pipeline; integrity and provenance checks.',
        budgets: 'Sets the data budget; high-rate links add power and pointing requirements.',
    },
    {
        id: 'robotics-operations',
        number: '10',
        name: 'Robotics, Docking and Station Operations',
        purpose: 'Assembly, maintenance and inspection, and the safe arrival and departure of visiting vehicles.',
        principles: 'Manipulator kinematics; contact dynamics in berthing and docking; proximity operations; crew and ground timelines.',
        models: 'Denavit–Hartenberg kinematics; manipulator dynamics; Clohessy–Wiltshire relative motion; contact and impact models; timeline scheduling.',
        interfaces: 'Grapple fixtures on the structure; power and data at each interface; attitude hold; communications.',
        telemetry: 'Joint angles and torques, end-effector loads, relative range and rate, docking-mechanism states.',
        dependencies: 'Attitude control, power (arm, mechanism heaters), avionics.',
        questions: 'How can a twin rehearse robotic tasks and visiting-vehicle approaches to reduce operational risk?',
        twin: 'Kinematic and contact models that replay planned and executed operations side by side.',
        deliverables: 'Station operations simulation; robotic task rehearsal model; docking load analysis.',
        budgets: 'Docked vehicles change mass properties and add power and thermal loads while attached.',
    },
    {
        id: 'health-fdir',
        number: '11',
        name: 'Integrated Health Monitoring and FDIR',
        purpose: 'Detects, isolates and recovers from faults across subsystems, and anticipates failures before they occur.',
        principles: 'Fault detection, isolation and recovery (FDIR); model-based diagnosis; residuals; fault trees; prognostics and remaining useful life; explainable results.',
        models: 'Residual r = y − ŷ with thresholds and persistence; Kalman filters; fault-propagation graphs; FMECA; remaining-useful-life estimation from degradation trends; Bayesian inference.',
        interfaces: 'Every subsystem’s telemetry and models; onboard fault management; ground operations.',
        telemetry: 'Residuals, health states, alarms, event logs, trend indicators.',
        dependencies: 'Needs a model of each monitored subsystem and data that can be trusted.',
        questions: 'How can cross-subsystem fault propagation be detected and explained early enough for crew and ground to act?',
        twin: 'A station-level health model linking subsystem twins, so a fault in one shows its consequences in the others.',
        deliverables: 'Health monitoring algorithms; fault detection and diagnostic models; fault-propagation graph.',
        budgets: 'Uses computation and data budget; protects the margins in all the others.',
    },
    {
        id: 'safety-assurance',
        number: '12',
        name: 'Safety, Reliability and Mission Assurance',
        purpose: 'Ensures the station, crew and mission are protected by design, by evidence and in operation.',
        principles: 'Hazard analysis; failure tolerance for catastrophic hazards; reliability engineering; verification and validation; configuration management; independent assessment.',
        models: 'Reliability R(t) = e^(−λt); fault-tree analysis; probabilistic risk assessment; FMECA; model credibility assessment.',
        interfaces: 'Every subsystem; operations; software assurance; cybersecurity.',
        telemetry: 'Hazard-control states, safety-critical parameters, verification evidence records.',
        dependencies: 'Every other subsystem.',
        questions: 'What evidence is needed before a digital twin’s prediction may inform a safety-relevant decision?',
        twin: 'Traceability from requirement to model to verification evidence, with each model’s credibility recorded.',
        deliverables: 'Model validation reports; engineering assurance evidence; hazard and reliability models.',
        budgets: 'Sets the margin policy across the mass, power, thermal and data budgets.',
    },
];

export const SYSTEM_FIELDS: readonly { key: Exclude<keyof StationSystem, 'id' | 'number' | 'name'>; label: string }[] = [
    { key: 'purpose', label: 'Purpose' },
    { key: 'principles', label: 'Engineering principles' },
    { key: 'models', label: 'Mathematics and physical models' },
    { key: 'interfaces', label: 'Important interfaces' },
    { key: 'telemetry', label: 'Sensors and telemetry' },
    { key: 'dependencies', label: 'Dependencies on other systems' },
    { key: 'budgets', label: 'Mass, power, thermal and data budgets' },
    { key: 'questions', label: 'Research question' },
    { key: 'twin', label: 'Digital twin opportunity' },
    { key: 'deliverables', label: 'Potential engineering deliverables' },
];

// ── Section E: what you will learn ──────────────────────────────────────────

export const LEVELS = [
    { level: 'Level 1', title: 'Understand', text: 'Space station architecture, orbital mechanics, mathematics, subsystem engineering, interfaces and requirements.' },
    { level: 'Level 2', title: 'Model', text: 'Physics, numerical simulation, electrical models, thermal models, environmental models and digital twin architecture.' },
    { level: 'Level 3', title: 'Investigate', text: 'Telemetry, diagnostics, anomaly detection, fault propagation, system health, predictive analytics and uncertainty.' },
    { level: 'Level 4', title: 'Verify', text: 'Integration, validation, software- and hardware-in-the-loop testing, mission assurance, safety engineering and scientific reproducibility.' },
] as const;

export interface Domain {
    title: string;
    prerequisites: string;
    skills: string;
    tools: string;
    theory: string;
    exercises: string;
    deliverables: string;
}

export const DOMAINS: readonly Domain[] = [
    {
        title: 'Space Station Systems Engineering',
        prerequisites: 'An engineering or physical-science degree, or equivalent professional experience.',
        skills: 'Requirements, interface definition, trade studies, mass/power/thermal/data budgets, technical reviews.',
        tools: 'Model-based systems engineering (SysML), requirements management, Python or spreadsheets for budgets.',
        theory: 'Systems engineering life cycle, the V-model, margin policy, configuration management.',
        exercises: `Build the four budgets for ${SRC_NAME}; write the interface definition between power and thermal control.`,
        deliverables: 'System architecture description, budgets and interface definitions.',
    },
    {
        title: 'Orbital Mechanics and Mathematical Modelling',
        prerequisites: 'Calculus, linear algebra and ordinary differential equations.',
        skills: 'Orbit propagation, eclipse and β-angle analysis, numerical integration and error control.',
        tools: 'Python (NumPy, SciPy), MATLAB or Octave, Jupyter notebooks.',
        theory: 'Two-body problem, J2 perturbation, drag, eclipse geometry, Runge–Kutta methods.',
        exercises: 'Compute eclipse duration against β-angle; propagate orbital decay and reboost; verify the reference case’s orbit numbers independently.',
        deliverables: 'An orbit and environment model with verification tests.',
    },
    {
        title: 'Structural and Modular Systems',
        prerequisites: 'Mechanics of materials, statics and dynamics.',
        skills: 'Pressure-vessel sizing, finite-element analysis, mass-properties tracking.',
        tools: 'CAD and open-source finite-element software.',
        theory: 'Thin-wall pressure vessels, structural dynamics, shielding against debris, fatigue.',
        exercises: 'Size a module shell for a given pressure; track centre of mass and inertia through an assembly sequence.',
        deliverables: 'A module structural concept and a mass-properties model.',
    },
    {
        title: 'Electrical Power and Battery Storage',
        prerequisites: 'Circuit theory and power-electronics fundamentals.',
        skills: 'Photovoltaic modelling, bus design, battery modelling, state-of-charge and state-of-health estimation.',
        tools: 'Python, Modelica or Simulink, SPICE circuit simulation.',
        theory: 'Photovoltaic I–V curves, DC–DC conversion, lithium-ion equivalent circuits and ageing.',
        exercises: `Reproduce the ${SRC_NAME} energy balance; inject a channel fault; estimate state of charge from noisy measurements.`,
        deliverables: 'A power simulation, a battery model and an experiment report.',
    },
    {
        title: 'Thermal and Environmental Systems',
        prerequisites: 'Heat transfer and thermodynamics.',
        skills: 'Thermal networks, radiator sizing, life-support mass balances.',
        tools: 'Python, thermal-network solvers, Modelica.',
        theory: 'Radiation exchange, pumped fluid loops, psychrometrics, life-support chemistry.',
        exercises: 'Size radiators for the reference load; model cabin CO₂ during a carbon-dioxide removal fault.',
        deliverables: 'A coupled power–thermal model and a cabin atmosphere model.',
    },
    {
        title: 'Avionics and Flight Software',
        prerequisites: 'Programming in C, C++, Rust or Python; digital systems.',
        skills: 'Real-time software, data buses, fault tolerance, software verification.',
        tools: 'Git, continuous integration, static analysis, simulators, unit-test frameworks.',
        theory: 'Redundancy, deterministic scheduling, software assurance practice.',
        exercises: 'Implement and test a telemetry limit check with persistence; build a mode-transition state machine.',
        deliverables: 'A verified software component with its test evidence.',
    },
    {
        title: 'Communications and Station Operations',
        prerequisites: 'Signals and systems.',
        skills: 'Link budgets, data handling, operations planning.',
        tools: 'Python, link-budget calculators, time-series and telemetry databases.',
        theory: 'RF propagation, modulation and coding, packet telemetry concepts.',
        exercises: 'Build a link budget; design a telemetry packet and a replay pipeline for it.',
        deliverables: 'A telemetry data model and an ingestion and replay prototype.',
    },
    {
        title: 'Robotics and Docking',
        prerequisites: 'Dynamics and control theory.',
        skills: 'Kinematics, relative motion, contact dynamics.',
        tools: 'Python, ROS 2, physics-based robot simulators.',
        theory: 'Denavit–Hartenberg kinematics, Clohessy–Wiltshire equations, impedance control.',
        exercises: 'Simulate a visiting-vehicle approach with the Clohessy–Wiltshire equations; compute an arm’s reach envelope.',
        deliverables: 'An approach simulation and a robotic task model.',
    },
    {
        title: 'Digital Twin Architecture',
        prerequisites: 'Software engineering and engineering modelling.',
        skills: 'Model integration, co-simulation, data synchronisation, model versioning.',
        tools: 'Python, FMI co-simulation, time-series databases, containers.',
        theory: 'Digital model, shadow and twin; synchronisation; uncertainty; model credibility.',
        exercises: 'Couple the power and thermal models through a defined interface; replay recorded telemetry into a model.',
        deliverables: 'A twin architecture document and a working coupled prototype.',
    },
    {
        title: 'Health Monitoring, FDIR and Prognostics',
        prerequisites: 'Statistics, estimation and control.',
        skills: 'Residual generation, thresholds, Kalman filtering, anomaly detection, remaining-useful-life estimation, explainability.',
        tools: 'Python (SciPy, scikit-learn), notebooks.',
        theory: 'Model-based diagnosis, hypothesis testing, Bayesian estimation, fault trees.',
        exercises: 'Design a detector for the channel-degradation experiment; measure false alarms against detection delay.',
        deliverables: 'A detector with ROC and latency evidence.',
    },
    {
        title: 'Cybersecurity and Mission Assurance',
        prerequisites: 'Networking and software fundamentals.',
        skills: 'Threat modelling, command authentication, data provenance, safety analysis.',
        tools: 'Threat-modelling methods, cryptographic libraries, fault-tree tools.',
        theory: 'Confidentiality, integrity and availability; secure boot; hazard analysis; failure tolerance.',
        exercises: 'Threat-model the telemetry pipeline; build a fault tree for loss of critical power.',
        deliverables: 'A threat model, a hazard analysis and a security test plan.',
    },
    {
        title: 'Research Methods and Technology Leadership',
        prerequisites: 'Grounding in at least one of the domains above.',
        skills: 'Research design, reproducibility, technical writing, technology roadmapping, readiness assessment, peer review.',
        tools: 'Git, notebooks, reference managers, LaTeX.',
        theory: 'Hypothesis-driven experiments, uncertainty quantification, verification and validation, technology readiness.',
        exercises: 'Write the protocol for one flagship experiment; review another contributor’s results.',
        deliverables: 'A reproducible experiment package and a technical paper or review.',
    },
];

export const DOMAIN_FIELDS: readonly { key: Exclude<keyof Domain, 'title'>; label: string }[] = [
    { key: 'prerequisites', label: 'Required prerequisites' },
    { key: 'skills', label: 'Skills to acquire' },
    { key: 'tools', label: 'Engineering tools' },
    { key: 'theory', label: 'Core theory' },
    { key: 'exercises', label: 'Practical research exercises' },
    { key: 'deliverables', label: 'Expected deliverables' },
];

// ── Section F: what you will research ───────────────────────────────────────

export const PROGRAMS: readonly { title: string; text: string; maturity: Maturity; priority: boolean }[] = [
    { title: 'Station Power & Energy Intelligence', text: 'Generation, storage and distribution models; energy margins through eclipses, degradation and faults; load priority that protects critical systems.', maturity: 'Simulation', priority: true },
    { title: 'Integrated Station Health Monitoring', text: 'Residual-based detection, isolation and explanation of faults, starting with power-channel and battery health.', maturity: 'Research', priority: true },
    { title: 'Integrated Space Station Digital Twin', text: 'A modular architecture in which subsystem twins share one environment, one data model and one evidence trail.', maturity: 'Concept', priority: false },
    { title: 'Thermal & Environmental Intelligence', text: 'Coupled power–thermal models and cabin atmosphere mass balances for heat rejection and life-support margins.', maturity: 'Planned', priority: false },
    { title: 'Robotics, Docking & Operations', text: 'Rehearsal models for robotic tasks, visiting-vehicle approaches and station operations timelines.', maturity: 'Planned', priority: false },
    { title: 'Autonomous Systems and Mission Assurance', text: 'Decision support with explainable recommendations, verified against safety requirements before any autonomy is claimed.', maturity: 'Planned', priority: false },
];

/** Research directions inside the programmes: planned work, not features. */
export const DIRECTIONS = [
    { title: 'AI for health monitoring', text: 'Fault detection, health classification, remaining useful life, predictive models and explainable recommendations. No model is trained yet.' },
    { title: 'Cybersecurity', text: 'Telemetry integrity, command authentication, secure software, data provenance, threat modelling and resilience testing.' },
    { title: 'Quantum-inspired optimisation', text: 'Resource scheduling, power optimisation and station operations planning. No quantum advantage is claimed.' },
] as const;

// ── Section G: what you will develop ────────────────────────────────────────

export type DeliverableStatus = 'Available' | 'Started' | 'Planned';

export const DELIVERABLES: readonly { title: string; status: DeliverableStatus; note: string }[] = [
    { title: 'Station reference architecture', status: 'Started', note: `${SRC_NAME}: a conceptual configuration and its subsystem breakdown, on this page.` },
    { title: 'Electrical power simulation engine', status: 'Started', note: `A deterministic orbit energy balance for ${SRC_NAME}. A channel-level power-flow engine is planned.` },
    { title: 'Battery energy storage digital twin', status: 'Planned', note: 'Today only the bulk state of charge is simulated; equivalent-circuit and ageing models are planned.' },
    { title: 'Telemetry ingestion and replay service', status: 'Planned', note: 'Not yet built.' },
    { title: 'Health monitoring algorithms', status: 'Started', note: 'A threshold-and-persistence residual rule, in simulation only. Statistical and learned detectors are planned.' },
    { title: 'Fault detection and diagnostic models', status: 'Started', note: `One simulated fault case (a degraded power channel). Isolation across subsystems is planned.` },
    { title: 'Station operations simulation', status: 'Planned', note: 'Not yet built.' },
    { title: 'Research experiment framework', status: 'Planned', note: 'Hypothesis, assumptions, code, data and review for each experiment.' },
    { title: 'Model validation reports', status: 'Planned', note: 'No station model has been validated against measured data.' },
    { title: 'Engineering assurance evidence', status: 'Planned', note: 'Traceability and credibility records for each model.' },
];

/** Existing foundations, each with its real maturity and where to see it. */
export const FOUNDATIONS: readonly { title: string; text: string; maturity: Maturity[]; href: string }[] = [
    { title: 'Satellite Energy & Telemetry Intelligence', text: 'The foundational 6U spacecraft energy and telemetry reference case, with published equations and fault experiments.', maturity: ['Research', 'Simulation'], href: '/research-lab#flagship-research' },
    { title: 'Space Digital Twin', text: 'Four interactive 3D experiences of a satellite, a constellation, a spacecraft and a space station, driven by simulated data.', maturity: ['Simulation'], href: '/research-lab#space-digital-twin' },
    { title: SRC_NAME, text: 'The station model on this page: a conceptual station with a deterministic energy and health simulation.', maturity: ['Concept', 'Simulation'], href: '#station-model' },
];

// ── Section H: flagship research ────────────────────────────────────────────

export const FLAGSHIP_STATION = {
    title: 'Space Station Energy & Health Intelligence',
    question: 'How can a space station maintain reliable power, protect critical systems and anticipate failures throughout long-duration orbital operations?',
} as const;

export const EXPERIMENTS: readonly { title: string; hypothesis: string; assumptions: string; outputs: string; validation: string }[] = [
    {
        title: 'Nominal station energy balance',
        hypothesis: `With the ${SRC_NAME} arrays and loads, the station returns to full charge every orbit at β = 0° with a positive orbit energy margin.`,
        assumptions: 'Circular 400 km orbit, β = 0°, constant grouped loads, sun-tracking arrays, fixed conversion and charge efficiencies, charge taper above 95 % SOC.',
        outputs: 'Orbit energy margin, state-of-charge trace, end-of-eclipse state of charge, depth of discharge.',
        validation: 'Energy closes over each orbit (generated = consumed + losses + change in stored energy) within numerical tolerance; independent recomputation agrees; eclipse duration matches the analytic shadow model.',
    },
    {
        title: 'Eclipse power management',
        hypothesis: 'A scheduled eclipse load plan keeps depth of discharge within a chosen limit across the longest eclipse of the year.',
        assumptions: 'Worst-case β-angle; stated battery capacity; a defined eclipse load plan and its priorities.',
        outputs: 'Depth of discharge per eclipse, minimum state of charge, energy deferred and research time affected.',
        validation: 'Depth of discharge stays below the limit in every simulated eclipse across the β-angle range; results hold under ±10 % battery capacity.',
    },
    {
        title: 'Solar generation degradation',
        hypothesis: 'String-level residuals detect a 10 % loss in one channel within a stated number of orbits at a false-alarm rate below a set limit.',
        assumptions: 'A sensor-noise model, a degradation profile and detection thresholds, all stated before the run.',
        outputs: 'Detection delay, false-alarm rate and estimated degradation, with uncertainty.',
        validation: 'ROC analysis on simulated data with known ground truth; later comparison with hardware-in-the-loop measurements.',
    },
    {
        title: 'Battery capacity loss',
        hypothesis: 'A stated capacity fade can be estimated from routine cycling data within a stated accuracy.',
        assumptions: 'An equivalent-circuit model, an ageing law and a sensor-noise model.',
        outputs: 'State-of-health estimate with uncertainty, and a projection of remaining useful life.',
        validation: 'The estimator converges to the injected capacity in simulation, then is tested against laboratory cell-cycling data before any claim is made.',
    },
    {
        title: 'Electrical power distribution fault',
        hypothesis: 'Priority-based load shedding keeps every critical load powered after the loss of one power channel, with a positive orbit margin.',
        assumptions: 'A channelised bus, a load-priority table and a stated reconfiguration time.',
        outputs: 'Critical-load availability, orbit margin before and after, research time lost.',
        validation: 'All critical loads stay powered in every single-channel-loss case with a positive margin; an independent implementation reproduces the results.',
    },
];

/** What the interactive model on this page already demonstrates (one case of experiment 5). */
export const DEMONSTRATED = `The interactive model runs one case of the last experiment: channel ${SRC_FAULT.channel} of ${SRC_CHANNELS} falls to ${Math.round(SRC_FAULT.factor * 100)} % output, the projected orbit margin moves from ${signed(SRC_MARGIN.nominal)} % to ${signed(SRC_MARGIN.degraded)} %, and load priority restores it to ${signed(SRC_MARGIN.protected)} % with all ${SRC_CRITICAL_KW} kW of critical loads still powered. Simulated, with illustrative parameters.`;

// ── Section I: skills and research opportunities ────────────────────────────

export interface Role {
    title: string;
    background: string;
    knowledge: string;
    maths: string;
    tools: string;
    challenges: string;
    products: string;
}

export const ROLES: readonly Role[] = [
    { title: 'Space Station Systems Engineer', background: 'Aerospace, mechanical or electrical engineering; systems experience.', knowledge: 'Architecture, requirements, interfaces, budgets, reviews.', maths: 'Linear algebra, probability, orbital mechanics basics.', tools: 'SysML, requirements management, Python.', challenges: 'Keeping coupled budgets and interfaces consistent as the design evolves.', products: 'Architecture description, budgets, interface definitions.' },
    { title: 'Electrical Power Engineer', background: 'Electrical or power-electronics engineering.', knowledge: 'Photovoltaics, DC buses, conversion, protection, load management.', maths: 'Circuit analysis, control theory, Fourier analysis.', tools: 'SPICE, Modelica or Simulink, Python.', challenges: 'Channel-level fault tolerance with the least loss of capability.', products: 'Power-flow models, protection studies, load-priority logic.' },
    { title: 'Battery and Energy Storage Engineer', background: 'Electrochemistry, electrical or chemical engineering.', knowledge: 'Lithium-ion behaviour, charge control, ageing, thermal limits.', maths: 'ODEs, estimation theory, statistics.', tools: 'Battery cyclers, equivalent-circuit modelling, Python.', challenges: 'Estimating state of health in orbit from routine data.', products: 'Battery models, SOC/SOH estimators, ageing studies.' },
    { title: 'Thermal / Environmental Systems Engineer', background: 'Mechanical or chemical engineering.', knowledge: 'Heat transfer, fluid loops, radiators, life-support chemistry.', maths: 'Heat equation, radiation exchange, mass balances.', tools: 'Thermal-network solvers, Modelica, CFD basics.', challenges: 'Coupling heat rejection to power use and cabin conditions.', products: 'Thermal networks, radiator sizing, cabin atmosphere models.' },
    { title: 'Digital Twin Software Engineer', background: 'Software engineering or computer science.', knowledge: 'Model integration, data pipelines, versioning, APIs.', maths: 'Numerical methods, discrete mathematics.', tools: 'Python, TypeScript, FMI co-simulation, databases, containers.', challenges: 'Synchronising many models with data while keeping results reproducible.', products: 'Twin services, co-simulation frameworks, replay tools.' },
    { title: 'Simulation and Mathematical Modelling Engineer', background: 'Applied mathematics, physics or engineering.', knowledge: 'Modelling, numerical simulation, verification, uncertainty.', maths: 'ODEs and PDEs, numerical analysis, statistics.', tools: 'Python (NumPy, SciPy), Julia or MATLAB, Jupyter.', challenges: 'Fast, verified models with known error bounds.', products: 'Verified simulation models and convergence studies.' },
    { title: 'Spacecraft Health Monitoring Researcher', background: 'Engineering, statistics or control.', knowledge: 'FDIR, residuals, diagnosis, telemetry analysis.', maths: 'Estimation, hypothesis testing, Bayesian inference.', tools: 'Python, Kalman filtering, notebooks.', challenges: 'Early detection with low false-alarm rates and clear explanations.', products: 'Detectors, diagnostic models, evaluation reports.' },
    { title: 'AI and Prognostics Researcher', background: 'Machine learning, statistics or engineering.', knowledge: 'Anomaly detection, remaining-useful-life estimation, explainability.', maths: 'Probability, optimisation, statistical learning.', tools: 'Python, scikit-learn, PyTorch.', challenges: 'Learning from scarce fault data and proving what a model can and cannot do.', products: 'Prognostic models with uncertainty and validation evidence.' },
    { title: 'Flight Software Engineer', background: 'Computer or embedded-systems engineering.', knowledge: 'Real-time systems, fault tolerance, software assurance.', maths: 'Discrete mathematics, logic, scheduling theory.', tools: 'C, C++ or Rust, RTOS, static analysis, CI.', challenges: 'Verifiable onboard health functions within tight resources.', products: 'Verified software components with test evidence.' },
    { title: 'Cybersecurity Engineer', background: 'Security engineering or computer science.', knowledge: 'Threat modelling, cryptography, secure software, provenance.', maths: 'Number theory basics, probability.', tools: 'Threat-modelling methods, cryptographic libraries, test tooling.', challenges: 'Trustworthy telemetry and commands end to end.', products: 'Threat models, security architectures, test reports.' },
    { title: 'Mission Operations Engineer', background: 'Aerospace engineering or operations experience.', knowledge: 'Timelines, procedures, contingencies, ground systems.', maths: 'Scheduling, probability.', tools: 'Planning tools, telemetry displays, Python.', challenges: 'Using twin predictions in real operational decisions.', products: 'Operations concepts, procedures, contingency analyses.' },
    { title: 'Verification and Validation Engineer', background: 'Engineering with testing or quality experience.', knowledge: 'Test design, model validation, credibility, traceability.', maths: 'Statistics, uncertainty quantification.', tools: 'Test frameworks, hardware-in-the-loop rigs, requirements tools.', challenges: 'Showing when a model is good enough for its intended use.', products: 'Validation plans, test reports, credibility assessments.' },
    { title: 'CTO / Technical Research Director', background: 'Senior engineering or research leadership.', knowledge: 'Technology strategy, research portfolios, readiness, risk.', maths: 'Decision analysis, systems thinking.', tools: 'Roadmapping, portfolio and risk tools.', challenges: 'Turning research into reusable engineering products, truthfully.', products: 'Technology roadmaps, research portfolios, review decisions.' },
];

export const ROLE_FIELDS: readonly { key: Exclude<keyof Role, 'title'>; label: string }[] = [
    { key: 'background', label: 'Required background' },
    { key: 'knowledge', label: 'Technical knowledge' },
    { key: 'maths', label: 'Mathematics and physics' },
    { key: 'tools', label: 'Software tools' },
    { key: 'challenges', label: 'Research challenges' },
    { key: 'products', label: 'Example work products' },
];

// ── Frequently asked questions (shown on the page and published as FAQPage data) ─────────

export const FAQ: readonly { question: string; answer: string }[] = [
    {
        question: 'What is the iTelematics Space Station Digital Twin R&D Center?',
        answer: 'It is the long-term engineering and scientific research programme of iTelematics Software Private Limited into physics-based, data-driven digital twins for future space stations. The first specialisation is station energy and health intelligence: how a station generates, stores and distributes power, protects its critical systems and anticipates failures.',
    },
    {
        question: 'Does iTelematics build or operate space stations?',
        answer: 'No. iTelematics researches the digital engineering that future stations need: models, simulations, health monitoring and assurance methods. It does not build, launch or operate space stations, and it makes no claim of flight heritage.',
    },
    {
        question: 'What is a space station digital twin?',
        answer: 'A system-specific, appropriately synchronised and validated digital representation of a station or one of its subsystems, with a defined engineering purpose. It differs from a simulation (a model that predicts behaviour under stated assumptions) and from a digital shadow (a representation updated from measured data without full two-way synchronisation).',
    },
    {
        question: 'Is the interactive station model on this page a digital twin?',
        answer: `No. It is a deterministic simulation of a conceptual station, ${SRC_NAME}, with illustrative parameters and simulated values, not flight data. It shows a nominal orbit with an eclipse, then a simulated solar-power fault and a protective load-priority response.`,
    },
    {
        question: `What is ${SRC_NAME}?`,
        answer: `A conceptual modular research station in a 400 km orbit used as a shared reference for station energy and health research: ${SRC_CHANNELS} solar power channels, battery storage and loads grouped by priority, with ${SRC_CRITICAL_KW} kW of critical loads. Its projected orbit energy margin is ${signed(SRC_MARGIN.nominal)} % nominal, ${signed(SRC_MARGIN.degraded)} % with one channel degraded and ${signed(SRC_MARGIN.protected)} % after load priority is applied.`,
    },
    {
        question: 'What are the current research priorities?',
        answer: 'Two programmes are active priorities: Station Power & Energy Intelligence and Integrated Station Health Monitoring. Integrated digital twin architecture is at concept stage; thermal and environmental intelligence, robotics and operations, and autonomous systems and mission assurance are planned.',
    },
    {
        question: 'How can researchers and organisations collaborate?',
        answer: 'Scientists, engineers, research organisations and technical leaders can propose a project, review a model or contribute to an experiment through the Research Lab or the contact page. Taking part does not imply employment, funding, certification or university affiliation.',
    },
    {
        question: 'What is the long-term vision?',
        answer: `${STATION.vision} The horizon is ${STATION.horizon}; milestones before then are proposed planning targets, not commitments.`,
    },
];

// ── Section J: roadmap ──────────────────────────────────────────────────────

export const ROADMAP = [
    { period: '2027', title: 'Foundations', text: 'Station reference architecture, electrical power simulation, battery models and the initial experiments.' },
    { period: '2028–2029', title: 'Research Integration', text: 'Telemetry integration, coupled subsystem models, diagnostics and independent model benchmarking.' },
    { period: '2030–2035', title: 'Advanced Engineering', text: 'Multi-subsystem digital twins, station-level health intelligence and external R&D collaborations.' },
    { period: '2036–2047', title: 'Long-Term Vision', text: 'Trusted, continuously updated digital twins for complex orbital infrastructure, contingent on actual technical and commercial progress.' },
] as const;
