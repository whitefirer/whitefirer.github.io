# Polaris2Istio的实现和说明


### 背景
如[融合、扩展Service Mesh](https://whitefirer.org/posts/2022/08/29/extension-and-expansion-of-service-mesh/)文中所述，为了让第三方服务发现的服务能够接入到Istio服务网格当中，我设计开放一个名为[**Polaris2Istio**](https://github.com/aeraki-mesh/polaris2istio)的组件。

### 设计图
<img src="https://raw.githubusercontent.com/aeraki-mesh/polaris2istio/main/doc/polaris2istio.png"> </img>

### 时序图
{{< mermaid >}}
sequenceDiagram
    actor Operator
    participant Polaris2Istio
    participant Polaris
    participant ApiServer
    participant CoreDNS
    Operator->>ApiServer: Create the ServiceEntry for the polairs' service with manager labels.
    ApiServer->>CoreDNS: Create the CNAME record.
    Operator->>Polaris2Istio: Config the manage policy.
    loop Watch ApiServer
        Polaris2Istio->>ApiServer: Get the matched services for manager.
        ApiServer-->>Polaris2Istio: Back the services.
        Polaris2Istio->>ApiServer:  Update the services' configuration(Instances' ip).
    end
    loop  Watch polaris
        Polaris2Istio->>Polaris: Watch the polaris service's event.
        Polaris-->>Polaris2Istio: Send the event to the polaris2sitio.
        Polaris2Istio->>ApiServer: Sync the polaris service's message to the k8s service.
    end
{{< /mermaid >}}

### 使用方式
#### 编译

```bash
make build
```

#### 运行

```bash
polaris2istio --polarisAddress <polarishost:port>
```

####  配置
##### 模式 1. 基于ServiceEntry的管理标签筛选同步Polaris实例:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: <polaris-name-for-k8s>
  namespace: polaris
  annotations:
    aeraki.net/polarisNamespace: Test
    aeraki.net/polarisService: test-service
    aeraki.net/external: "false"
  labels:
    manager: aeraki
    registry: polaris
spec:
  hosts:
    - dev.<polaris-name-for-k8s>.polaris
  resolution: NONE # or STATIC
```
 详细说明请参考：[https://github.com/aeraki-mesh/polaris2istio](https://github.com/aeraki-mesh/polaris2istio)

### 心得技巧
#### 保持分配好的VIP
```go {linenos=table,hl_lines=[22],linenostart=91}
// polaris2istio/pkg/serviceregistry/polaris/watcher/provider.go 
func (w *ProviderWatcher) syncPolarisServices2Istio(polarisInfo *model.PolarisInfo) {
	klog.Infof("[syncPolarisServices2Istio] polarisInfo: %v", polarisInfo)
	rsp, err := w.polarisclient.GetPolarisAllInstances(polarisInfo.PolarisNamespace, polarisInfo.PolarisService)
	if err != nil {
		klog.Errorf("[syncPolarisServices2Istio] query polaris services' instances failed, err: %v", err.Error())
		return
	}

	newServiceEntry, newAnnotations := model.ConvertServiceEntry(rsp, polarisInfo)
	if newServiceEntry == nil {
		klog.Errorf("convertServiceEntry failed?")
		return
	}

	oldServiceEntry, err := w.ic.NetworkingV1alpha3().ServiceEntries(w.configRootNS).Get(context.TODO(), model.CovertServiceName(polarisInfo.PolarisNamespace, polarisInfo.PolarisService), v1.GetOptions{})
	if err != nil {
		klog.Infof("[syncPolarisServices2Istio] get old service entries failed, error: %v", err)
		return
	}

	newServiceEntry.Addresses = append(newServiceEntry.Addresses, oldServiceEntry.Spec.GetAddresses()...)

	if revision, exists := oldServiceEntry.GetAnnotations()["aeraki.net/revision"]; !exists || newAnnotations["aeraki.net/revision"] != revision {
		klog.Infof("[syncPolarisServices2Istio] update serviceentry: %v", newServiceEntry)
		_, err = w.ic.NetworkingV1alpha3().ServiceEntries(oldServiceEntry.Namespace).Update(context.TODO(),
			w.toServiceEntryCRD(model.CovertServiceName(polarisInfo.PolarisNamespace, polarisInfo.PolarisService), newServiceEntry, oldServiceEntry, newAnnotations),
			v1.UpdateOptions{FieldManager: aerakiFieldManager})
		if err != nil {
			klog.Errorf("failed to update ServiceEntry: %s", err.Error())
		}
	} else {
		log.Infof("[syncPolarisServices2Istio] serviceentry unchanged: %v", oldServiceEntry.GetName())
	}
}
```

[代码](https://github.com/aeraki-mesh/polaris2istio/blob/c3a5ad86ab503ba183359a7e141fa3be7a996315/pkg/serviceregistry/polaris/watcher/provider.go#L111)


### 注意事项
 1. 只对polaris命名空间中的ServiceEntrys同步；
 2. 在集群中运行时需要为其配置[权限策略](https://github.com/aeraki-mesh/polaris2istio/blob/main/deploy/prod/rbac.yaml)；
 3. 开源版本的polaris sdk是需要手动设置polaris地址的，与内部版不同；

