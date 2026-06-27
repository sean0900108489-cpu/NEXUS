export type ServiceBoardTaskStatus = "open" | "shortlisted" | "booked";

export type ServiceBoardTask = {
  id: string;
  title: string;
  description: string;
  location: string;
  budgetCredits: number;
  dueLabel: string;
  posterName: string;
  status: ServiceBoardTaskStatus;
  offerCount: number;
  bestOfferCredits?: number;
  skills: string[];
};

export const SERVICE_BOARD_STATUS_LABELS: Record<ServiceBoardTaskStatus, string> = {
  open: "Open",
  shortlisted: "Shortlisted",
  booked: "Booked",
};

export const SERVICE_BOARD_DEMO_TASKS: ServiceBoardTask[] = [
  {
    id: "request-venue-lighting",
    title: "Set up lighting for a pop-up launch",
    description:
      "Need a compact lighting plan and same-day setup for a small product reveal.",
    location: "Surry Hills",
    budgetCredits: 420,
    dueLabel: "Fri afternoon",
    posterName: "Mira Chen",
    status: "open",
    offerCount: 4,
    bestOfferCredits: 360,
    skills: ["event setup", "lighting", "gear check"],
  },
  {
    id: "request-landing-copy",
    title: "Rewrite a service landing page",
    description:
      "Turn a rough offer page into sharper copy with a clear request flow.",
    location: "Remote",
    budgetCredits: 280,
    dueLabel: "This week",
    posterName: "NEXUS Studio",
    status: "shortlisted",
    offerCount: 7,
    bestOfferCredits: 240,
    skills: ["copywriting", "service design", "conversion"],
  },
  {
    id: "request-photo-edit",
    title: "Retouch twelve catalog photos",
    description:
      "Clean background, balance color, and export web-ready product images.",
    location: "Remote",
    budgetCredits: 180,
    dueLabel: "Tomorrow",
    posterName: "Orbit Supply",
    status: "booked",
    offerCount: 3,
    bestOfferCredits: 175,
    skills: ["photo editing", "ecommerce", "assets"],
  },
];

export function getServiceBoardTaskCounts(tasks = SERVICE_BOARD_DEMO_TASKS) {
  return tasks.reduce<Record<ServiceBoardTaskStatus, number>>(
    (counts, task) => ({
      ...counts,
      [task.status]: counts[task.status] + 1,
    }),
    { open: 0, shortlisted: 0, booked: 0 },
  );
}
