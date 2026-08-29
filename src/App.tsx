import EmploymentExplorer from './features/employment-explorer/EmploymentExplorer';

/**
 * Standalone host shell. In the Lovable transfer, <EmploymentExplorer /> is
 * mounted on the /employment-explorer route instead (BuildSpec §11).
 */
export default function App() {
  return <EmploymentExplorer />;
}
