import { containerDisplayName, listContainers, resolveConnection } from "../docker.js";
import type { DockerMonitorTypeData } from "../../types/docker.js";
import { RestoreSavedMonitorSecrets } from "./monitorsController.js";

export interface DockerContainerOption {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
}

/**
 * Container picker for the DOCKER monitor editor. Takes the unsaved form fields, so browsing works before a save;
 * `monitorId` puts back a saved monitor's masked `tlsKey`. `$SECRET` references resolve server-side, as in a monitor run.
 */
export const ListDockerContainers = async (
  formData: Partial<DockerMonitorTypeData>,
  monitorId?: number,
): Promise<DockerContainerOption[]> => {
  const typeData = (await RestoreSavedMonitorSecrets(formData, monitorId)) as Partial<DockerMonitorTypeData>;
  const timeout = typeData.timeout && typeData.timeout > 0 ? typeData.timeout : undefined;
  const { data } = await listContainers(resolveConnection(typeData), timeout);
  return data.map((container) => ({
    id: container.Id,
    name: containerDisplayName(container.Names),
    image: container.Image,
    state: container.State,
    status: container.Status,
  }));
};
