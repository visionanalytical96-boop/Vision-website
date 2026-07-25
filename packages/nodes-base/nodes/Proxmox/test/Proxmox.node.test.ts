import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test Proxmox Node', () => {
	const credentials = {
		proxmoxApi: {
			host: 'fake-proxmox-server.example.com',
			port: 8006,
			tokenId: 'root@pam!n8n',
			tokenSecret: 'fake-token-secret',
			allowUnauthorizedCerts: true,
		},
	};

	beforeAll(() => {
		const { host, port } = credentials.proxmoxApi;
		const mock = nock(`https://${host}:${port}`);

		mock.get('/api2/json/nodes').reply(200, {
			data: [
				{ node: 'pve', status: 'online', cpu: 0.05, maxmem: 33654325248 },
				{ node: 'pve2', status: 'online', cpu: 0.02, maxmem: 16777216000 },
			],
		});

		mock.get('/api2/json/nodes/pve/qemu').reply(200, {
			data: [{ vmid: 100, name: 'test-vm', status: 'running' }],
		});

		mock.post('/api2/json/nodes/pve/qemu/100/status/start').reply(200, {
			data: 'UPID:pve:00001234:00ABCDEF:00000000:qmstart:100:root@pam!n8n:',
		});
	});

	new NodeTestHarness().setupTests({ credentials });
});
