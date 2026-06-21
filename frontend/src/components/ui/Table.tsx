import React, { ReactNode, createContext, useContext } from 'react';

const TableContext = createContext<{
  gridTemplate?: string;
  isGrid?: boolean;
} | null>(null);

export function Table({ children, gridTemplate }: { children: ReactNode; gridTemplate?: string }) {
  return (
    <TableContext.Provider value={{ gridTemplate, isGrid: !!gridTemplate }}>
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-full">
            {children}
          </table>
        </div>
      </div>
    </TableContext.Provider>
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  const context = useContext(TableContext);
  const style = context?.isGrid ? { gridTemplateColumns: context.gridTemplate } : undefined;

  return (
    <thead>
      <tr 
        style={style}
        className={`bg-white/5 border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest h-12 ${
          context?.isGrid ? 'grid w-full items-center' : ''
        }`}
      >
        {children}
      </tr>
    </thead>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="divide-y divide-white/5">
      {children}
    </tbody>
  );
}

export function TableRow({ children, onClick, className = '' }: { children: ReactNode, onClick?: () => void, className?: string }) {
  const context = useContext(TableContext);
  const style = context?.isGrid ? { gridTemplateColumns: context.gridTemplate } : undefined;

  return (
    <tr 
      onClick={onClick}
      style={style}
      className={`hover:bg-white/5 transition-colors text-sm group ${onClick ? 'cursor-pointer' : ''} ${
        context?.isGrid ? 'grid w-full items-center border-b border-white/5 h-[72px] min-h-[72px]' : ''
      } ${className}`}
    >
      {children}
    </tr>
  );
}

function getAlignmentClasses(className: string) {
  const classes = className.split(/\s+/);
  
  const hasStart = classes.some(c => c === 'justify-start' || c === 'text-left' || c.endsWith(':justify-start') || c.endsWith(':text-left'));
  const hasEnd = classes.some(c => c === 'justify-end' || c === 'text-right' || c.endsWith(':justify-end') || c.endsWith(':text-right'));
  
  if (hasStart) return 'justify-start text-left';
  if (hasEnd) return 'justify-end text-right';
  return 'justify-center text-center';
}

export function TableHead({ children, className = '', title }: { children: ReactNode, className?: string, title?: string }) {
  const context = useContext(TableContext);
  const alignmentClass = getAlignmentClasses(className);

  return (
    <th className={`p-0 align-middle ${context?.isGrid ? 'h-full flex items-center' : ''} ${className}`} title={title}>
      <div className={`flex items-center px-4 py-3 h-full min-h-[48px] w-full ${alignmentClass}`}>
        {children}
      </div>
    </th>
  );
}

export function TableCell({ children, className = '', title }: { children: ReactNode, className?: string, title?: string }) {
  const context = useContext(TableContext);
  const alignmentClass = getAlignmentClasses(className);

  return (
    <td className={`p-0 align-middle ${context?.isGrid ? 'h-full flex items-center' : ''} ${className}`} title={title}>
      <div className={`flex items-center px-4 py-3 h-full min-h-[72px] h-[72px] w-full ${alignmentClass}`}>
        {children}
      </div>
    </td>
  );
}

export function truncateUUID(uuid: string): string {
  if (!uuid || typeof uuid !== 'string' || uuid.length < 24) return uuid;
  return `${uuid.slice(0, 18)}...${uuid.slice(-7)}`;
}

