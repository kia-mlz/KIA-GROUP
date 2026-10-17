export interface AnimationEntry {
  name: string;
  code: string;
}

export const animationsDB: AnimationEntry[] = [
  {
    name: "fade-in",
    code: "@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }",
  },
  {
    name: "fade-out",
    code: "@keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }",
  },
  {
    name: "slide-up",
    code: "@keyframes slide-up { from { transform: translateY(18px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }",
  },
  {
    name: "slide-down",
    code: "@keyframes slide-down { from { transform: translateY(-18px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }",
  },
  {
    name: "slide-left",
    code: "@keyframes slide-left { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }",
  },
  {
    name: "slide-right",
    code: "@keyframes slide-right { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }",
  },
  {
    name: "scale-in",
    code: "@keyframes scale-in { from { transform: scale(.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }",
  },
  {
    name: "scale-out",
    code: "@keyframes scale-out { from { transform: scale(1); opacity: 1; } to { transform: scale(.85); opacity: 0; } }",
  },
  {
    name: "rotate-in",
    code: "@keyframes rotate-in { from { transform: rotate(-9deg) scale(.9); opacity: 0; } to { transform: rotate(0) scale(1); opacity: 1; } }",
  },
  {
    name: "rotate-out",
    code: "@keyframes rotate-out { from { transform: rotate(0) scale(1); opacity: 1; } to { transform: rotate(9deg) scale(.9); opacity: 0; } }",
  },
  {
    name: "bounce",
    code: "@keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }",
  },
  {
    name: "pulse",
    code: "@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }",
  },
  {
    name: "shake-x",
    code: "@keyframes shake-x { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }",
  },
  {
    name: "shake-y",
    code: "@keyframes shake-y { 0%,100% { transform: translateY(0); } 25% { transform: translateY(-6px); } 75% { transform: translateY(6px); } }",
  },
  {
    name: "flip-x",
    code: "@keyframes flip-x { from { transform: perspective(500px) rotateX(90deg); opacity: 0; } to { transform: perspective(500px) rotateX(0); opacity: 1; } }",
  },
  {
    name: "flip-y",
    code: "@keyframes flip-y { from { transform: perspective(500px) rotateY(90deg); opacity: 0; } to { transform: perspective(500px) rotateY(0); opacity: 1; } }",
  },
  {
    name: "swing",
    code: "@keyframes swing { 20% { transform: rotate(12deg); } 40% { transform: rotate(-9deg); } 60% { transform: rotate(5deg); } 80% { transform: rotate(-3deg); } 100% { transform: rotate(0); } }",
  },
  {
    name: "wobble",
    code: "@keyframes wobble { 0% { transform: translateX(0); } 15% { transform: translateX(-20px) rotate(-5deg); } 30% { transform: translateX(15px) rotate(3deg); } 45% { transform: translateX(-10px) rotate(-3deg); } 60% { transform: translateX(8px) rotate(2deg); } 100% { transform: translateX(0); } }",
  },
  {
    name: "rubber-band",
    code: "@keyframes rubber-band { 0% { transform: scale(1); } 30% { transform: scaleX(1.25) scaleY(.75); } 40% { transform: scaleX(.75) scaleY(1.25); } 60% { transform: scaleX(1.15) scaleY(.9); } 100% { transform: scale(1); } }",
  },
  {
    name: "zoom-in-up",
    code: "@keyframes zoom-in-up { from { transform: scale(.2) translateY(100px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }",
  },
  {
    name: "zoom-in-down",
    code: "@keyframes zoom-in-down { from { transform: scale(.2) translateY(-100px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }",
  },
  {
    name: "blur-in",
    code: "@keyframes blur-in { from { filter: blur(12px); opacity: 0; } to { filter: blur(0); opacity: 1; } }",
  },
  {
    name: "blur-out",
    code: "@keyframes blur-out { from { filter: blur(0); opacity: 1; } to { filter: blur(12px); opacity: 0; } }",
  },
  {
    name: "float",
    code: "@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }",
  },
  {
    name: "wave",
    code: "@keyframes wave { 0% { transform: rotate(0); } 25% { transform: rotate(7deg); } 50% { transform: rotate(-6deg); } 75% { transform: rotate(3deg); } 100% { transform: rotate(0); } }",
  },
  {
    name: "heartbeat",
    code: "@keyframes heartbeat { 0%,40%,80%,100% { transform: scale(1); } 20%,60% { transform: scale(1.12); } }",
  },
  {
    name: "glow",
    code: "@keyframes glow { 0%,100% { box-shadow: 0 0 0 rgba(201,169,89,0); } 50% { box-shadow: 0 0 22px rgba(201,169,89,.65); } }",
  },
  {
    name: "slide-rotate",
    code: "@keyframes slide-rotate { from { transform: translateX(-30px) rotate(-10deg); opacity: 0; } to { transform: translateX(0) rotate(0); opacity: 1; } }",
  },
  {
    name: "pop-in",
    code: "@keyframes pop-in { 0% { transform: scale(.7); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }",
  },
  {
    name: "curtain-open",
    code: "@keyframes curtain-open { from { clip-path: inset(0 50% 0 50%); opacity: 0; } to { clip-path: inset(0 0 0 0); opacity: 1; } }",
  },
];

