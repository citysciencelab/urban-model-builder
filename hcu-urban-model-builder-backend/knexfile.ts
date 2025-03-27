// For more information about this file see https://dove.feathersjs.com/guides/cli/databases.html
import nodeConfig from 'config'

// Load our database connection info from the app configuration
const config = nodeConfig.get('postgresql') as Record<string, any>

export const onUpdateTrigger = (table: string) => `
  CREATE TRIGGER ${table}_updated_at
  BEFORE UPDATE ON ${table}
  FOR EACH ROW
  EXECUTE PROCEDURE on_update_timestamp();
`

export default { ...config }
