import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ProxmoxApi implements ICredentialType {
	name = 'proxmoxApi';

	displayName = 'Proxmox API';

	documentationUrl = 'proxmox';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
			placeholder: 'my-proxmox-server.example.com',
			description: 'Hostname or IP address of the Proxmox VE server, without protocol or port',
			required: true,
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 8006,
			description: 'Port the Proxmox VE API is listening on',
		},
		{
			displayName: 'Token ID',
			name: 'tokenId',
			type: 'string',
			default: '',
			placeholder: 'root@pam!n8n',
			description: 'API token ID in the format USER@REALM!TOKENID',
			required: true,
		},
		{
			displayName: 'Token Secret',
			name: 'tokenSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Secret value of the API token',
			required: true,
		},
		{
			displayName: 'Allow Unauthorized Certificates',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			description: 'Whether to connect even if SSL certificate validation is not possible',
			default: false,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=PVEAPIToken={{$credentials.tokenId}}={{$credentials.tokenSecret}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.host}}:{{$credentials.port}}/api2/json',
			url: '/version',
			skipSslCertificateValidation: '={{$credentials.allowUnauthorizedCerts}}',
		},
	};
}
