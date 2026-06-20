const sizes = {
  sm: 'w-4.5 h-4.5 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
};

export default function Spinner({ size = 'md' }) {
  return <div className={`rounded-full border-[#232640] border-t-indigo-500 animate-spin-custom ${sizes[size] || sizes.md}`} />;
}
