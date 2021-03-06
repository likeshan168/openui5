/* global sinon QUnit */
jQuery.sap.require("sap.ui.qunit.qunit-coverage");

QUnit.config.autostart = false;

sap.ui.require([
	"sap/ui/fl/variants/VariantController", "sap/ui/fl/variants/VariantModel", "sap/ui/fl/variants/VariantManagement", "sap/ui/fl/Utils", "sap/ui/fl/FlexControllerFactory", "sap/ui/fl/changeHandler/BaseTreeModifier"
], function(VariantController, VariantModel, VariantManagement, Utils, FlexControllerFactory, BaseTreeModifier) {
	"use strict";
	sinon.config.useFakeTimers = false;
	QUnit.start();

	var sandbox = sinon.sandbox.create();
	sandbox.stub(Utils, "getCurrentLayer").returns("CUSTOMER");

	QUnit.module("Given an instance of VariantModel", {
		beforeEach: function(assert) {
			this.oData = {
				"variantMgmtId1": {
					"defaultVariant": "variant1",
					"originalDefaultVariant": "variant1",
					"variants": [
						{
							"author": "SAP",
							"key": "variantMgmtId1",
							"layer": "VENDOR",
							"remove": false,
							"title": "Standard",
							"favorite": true,
							"visible": true
						}, {
							"author": "Me",
							"key": "variant0",
							"layer": "CUSTOMER",
							"remove": true,
							"title": "variant A",
							"favorite": true,
							"visible": true
						}, {
							"author": "Me",
							"key": "variant1",
							"layer": "CUSTOMER",
							"remove": true,
							"title": "variant B",
							"favorite": false,
							"visible": true
						}
					]
				}
			};

			var oManifestObj = {
				"sap.app": {
					id: "MyComponent",
					"applicationVersion": {
						"version": "1.2.3"
					}
				}
			};
			var oManifest = new sap.ui.core.Manifest(oManifestObj);
			this.oComponent = {
				name: "MyComponent",
				appVersion: "1.2.3",
				getId: function() {
					return "RTADemoAppMD";
				},
				getManifestObject: function() {
					return oManifest;
				}
			};
			sandbox.stub(Utils, "getComponentClassName").returns("MyComponent");

			this.oFlexController = FlexControllerFactory.createForControl(this.oComponent, oManifest);
			this.fnLoadSwitchChangesStub = sandbox.stub(this.oFlexController._oChangePersistence, "loadSwitchChangesMapForComponent").returns({aRevert:[], aNew:[]});
			this.fnRevertChangesStub = sandbox.stub(this.oFlexController, "revertChangesOnControl");
			this.fnApplyChangesStub = sandbox.stub(this.oFlexController, "applyVariantChanges");

			this.oModel = new VariantModel(this.oData, this.oFlexController, this.oComponent);
		},
		afterEach: function(assert) {
			sandbox.restore();
			delete this.oFlexController;
		}
	});

	QUnit.test("when calling 'getData'", function(assert) {
		var sExpectedJSON = "{\"variantMgmtId1\":{" + "\"modified\":false,"  + "\"variantsEditable\":true," + "\"showFavorites\":true," + "\"defaultVariant\":\"variant1\","  + "\"originalDefaultVariant\":\"variant1\"," + "\"variants\":[{" + "\"author\":\"SAP\"," + "\"key\":\"variantMgmtId1\"," + "\"layer\":\"VENDOR\"," + "\"originalFavorite\":true," + "\"originalTitle\":\"Standard\"," + "\"remove\":false," + "\"rename\":false," + "\"favorite\":true,"  + "\"title\":\"Standard\"," + "\"visible\":true" + "}," + "{" + "\"author\":\"Me\"," + "\"key\":\"variant0\"," + "\"layer\":\"CUSTOMER\"," + "\"originalFavorite\":true,"  + "\"originalTitle\":\"variant A\"," + "\"remove\":true," + "\"rename\":false," + "\"favorite\":true," + "\"title\":\"variant A\"," + "\"visible\":true" + "}," + "{" + "\"author\":\"Me\"," + "\"key\":\"variant1\"," + "\"layer\":\"CUSTOMER\"," + "\"originalFavorite\":false," + "\"originalTitle\":\"variant B\"," + "\"remove\":true," + "\"rename\":false," + "\"favorite\":false,"  + "\"title\":\"variant B\"," + "\"visible\":true" + "}]," + "\"currentVariant\":\"variant1\"" + "}" + "}";
		var sCurrentVariant = this.oModel.getCurrentVariantReference("variantMgmtId1");
		assert.deepEqual(this.oModel.getData(), JSON.parse(sExpectedJSON));
		assert.equal(sCurrentVariant, "variant1", "then the key of the current variant is returned");
	});

	QUnit.test("when calling '_setModelPropertiesForControl'", function(assert) {
		assert.equal(this.oModel.getData()["variantMgmtId1"].variantsEditable, true, "the parameter variantsEditable is initially true");
		this.oModel._setModelPropertiesForControl("variantMgmtId1", true);
		assert.equal(this.oModel.getData()["variantMgmtId1"].variantsEditable, false, "the parameter variantsEditable is set to false for bAdaptationMode = true");
		this.oModel._setModelPropertiesForControl("variantMgmtId1", false);
		assert.equal(this.oModel.getData()["variantMgmtId1"].variantsEditable, true, "the parameter variantsEditable is set to true for bAdaptationMode = false");
	});

	QUnit.test("when calling 'getVariantManagementReference'", function(assert) {
		var mVariantManagementReference = this.oModel.getVariantManagementReference("variant1");
		assert.deepEqual(mVariantManagementReference, {
			"variantIndex": 2,
			"variantManagementReference": "variantMgmtId1"
		}, "then the correct variant management reference is returned");
	});

	QUnit.test("when calling 'getVariantProperty' with title as property", function(assert) {
		sandbox.stub(this.oModel.oVariantController, "getVariant").returns(
			{
				content:
					{
						title: this.oData["variantMgmtId1"].variants[2].title
					}
			}
		);
		var sPropertyValue = this.oModel.getVariantProperty("variant1", "title");
		assert.equal(sPropertyValue, this.oData["variantMgmtId1"].variants[2].title, "then the correct title value is returned");
	});

	QUnit.test("when calling '_setVariantProperties' for 'setTitle' to add a change", function(assert) {
		var fnSetVariantDataStub = sandbox.stub(this.oModel.oVariantController, "_setVariantData").returns(1);
		var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
		var fnAddDirtyChangeStub = sandbox.stub(this.oFlexController._oChangePersistence, "addDirtyChange");
		var mPropertyBag = {
			"changeType" : "setTitle",
			"title" : "New Title",
			"layer" : "CUSTOMER",
			"variantReference" : "variant1",
			"appComponent" : this.oComponent
		};

		var oChange = this.oModel._setVariantProperties("variantMgmtId1", mPropertyBag, true);
		assert.equal(oChange.getText("title"), mPropertyBag.title, "then the new change created with the new title");
		assert.equal(oChange.getChangeType(), "setTitle", "then the new change created with 'setTitle' as changeType");
		assert.equal(oChange.getFileType(), "ctrl_variant_change", "then the new change created with 'ctrl_variant_change' as fileType");
		assert.ok(fnAddDirtyChangeStub.calledWith(oChange), "then 'FlexController.addDirtyChange called with the newly created change");
		assert.equal(this.oModel.getData()["variantMgmtId1"].variants[1].title, mPropertyBag.title, "then the new title updated in the VariantModel");
		assert.ok(fnSetVariantDataStub.calledOnce, "then '_setVariantData' of VariantController called");
		assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
	});

	QUnit.test("when calling '_setVariantProperties' for 'setTitle' to delete a change", function(assert) {
		var fnSetVariantDataStub = sandbox.stub(this.oModel.oVariantController, "_setVariantData").returns(1);
		var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
		var fnChangeStub = sandbox.stub().returns({ getDefinition : function() {} });
		var fnDeleteChangeStub = sandbox.stub(this.oFlexController._oChangePersistence, "deleteChange");
		var mPropertyBag = {
			"changeType" : "setTitle",
			"title" : "Old Title",
			"variantReference" : "variant1",
			"change" : fnChangeStub()
		};

		var oChange = this.oModel._setVariantProperties("variantMgmtId1", mPropertyBag, false);
		assert.notOk(oChange, "then no change returned");
		assert.ok(fnDeleteChangeStub.calledWith(mPropertyBag.change), "then 'FlexController.deleteChange' called with the passed change");
		assert.equal(this.oModel.getData()["variantMgmtId1"].variants[1].title, mPropertyBag.title, "then the new title updated in the VariantModel");
		assert.ok(fnSetVariantDataStub.callCount, 0, "then '_setVariantData' of VariantController not called");
		assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
	});

	QUnit.test("when calling '_setVariantProperties' for 'setFavorite' to add a change", function(assert) {
		var fnSetVariantDataStub = sandbox.stub(this.oModel.oVariantController, "_setVariantData").returns(1);
		var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
		var fnAddDirtyChangeStub = sandbox.stub(this.oFlexController._oChangePersistence, "addDirtyChange");
		var mPropertyBag = {
			"changeType" : "setFavorite",
			"favorite" : false,
			"layer" : "CUSTOMER",
			"variantReference" : "variant1",
			"appComponent" : this.oComponent
		};

		var oChange = this.oModel._setVariantProperties("variantMgmtId1", mPropertyBag, true);
		assert.equal(oChange.getContent().favorite, mPropertyBag.favorite, "then the new change created with the parameter 'favorite' in content");
		assert.equal(oChange.getChangeType(), "setFavorite", "then the new change created with 'setFavorite' as changeType");
		assert.equal(oChange.getFileType(), "ctrl_variant_change", "then the new change created with 'ctrl_variant_change' as fileType");
		assert.ok(fnAddDirtyChangeStub.calledWith(oChange), "then 'FlexController.addDirtyChange called with the newly created change");
		assert.equal(this.oModel.getData()["variantMgmtId1"].variants[1].favorite, mPropertyBag.favorite, "then the parameter 'favorite' updated in the VariantModel");
		assert.ok(fnSetVariantDataStub.calledOnce, "then '_setVariantData' of VariantController called");
		assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
	});

	QUnit.test("when calling '_setVariantProperties' for 'setFavorite' to delete a change", function(assert) {
		var fnSetVariantDataStub = sandbox.stub(this.oModel.oVariantController, "_setVariantData").returns(1);
		var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
		var fnChangeStub = sandbox.stub().returns({ getDefinition : function() {} });
		var fnDeleteChangeStub = sandbox.stub(this.oFlexController._oChangePersistence, "deleteChange");
		var mPropertyBag = {
			"changeType" : "setFavorite",
			"favorite" : true,
			"variantReference" : "variant1",
			"change" : fnChangeStub()
		};

		var oChange = this.oModel._setVariantProperties("variantMgmtId1", mPropertyBag, false);
		assert.notOk(oChange, "then no change returned");
		assert.ok(fnDeleteChangeStub.calledWith(mPropertyBag.change), "then 'FlexController.deleteChange' called with the passed change");
		assert.equal(this.oModel.getData()["variantMgmtId1"].variants[1].favorite, mPropertyBag.favorite, "then the parameter 'favorite' updated in the VariantModel");
		assert.ok(fnSetVariantDataStub.callCount, 0, "then '_setVariantData' of VariantController not called");
		assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
	});

	QUnit.test("when calling '_setVariantProperties' for 'setVisible' to add a change", function(assert) {
		var fnSetVariantDataStub = sandbox.stub(this.oModel.oVariantController, "_setVariantData").returns(1);
		var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
		var fnAddDirtyChangeStub = sandbox.stub(this.oFlexController._oChangePersistence, "addDirtyChange");
		var mPropertyBag = {
			"changeType" : "setVisible",
			"visible" : false,
			"layer" : "CUSTOMER",
			"variantReference" : "variant1",
			"appComponent" : this.oComponent
		};

		var oChange = this.oModel._setVariantProperties("variantMgmtId1", mPropertyBag, true);
		assert.equal(oChange.getContent().visible, mPropertyBag.visible, "then the new change created with the parameter 'visible' in content");
		assert.equal(oChange.getChangeType(), "setVisible", "then the new change created with 'setVisible' as changeType");
		assert.equal(oChange.getFileType(), "ctrl_variant_change", "then the new change created with 'ctrl_variant_change' as fileType");
		assert.ok(fnAddDirtyChangeStub.calledWith(oChange), "then 'FlexController.addDirtyChange called with the newly created change");
		assert.equal(this.oModel.getData()["variantMgmtId1"].variants[1].visible, mPropertyBag.visible, "then the parameter 'visible' updated in the VariantModel");
		assert.ok(fnSetVariantDataStub.calledOnce, "then '_setVariantData' of VariantController called");
		assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
	});

	QUnit.test("when calling '_setVariantProperties' for 'setVisible' to delete a change", function(assert) {
		var fnSetVariantDataStub = sandbox.stub(this.oModel.oVariantController, "_setVariantData").returns(1);
		var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
		var fnChangeStub = sandbox.stub().returns({ getDefinition : function() {} });
		var fnDeleteChangeStub = sandbox.stub(this.oFlexController._oChangePersistence, "deleteChange");
		var mPropertyBag = {
			"changeType" : "setVisible",
			"visible" : true,
			"variantReference" : "variant1",
			"change" : fnChangeStub()
		};

		var oChange = this.oModel._setVariantProperties("variantMgmtId1", mPropertyBag, false);
		assert.notOk(oChange, "then no change returned");
		assert.ok(fnDeleteChangeStub.calledWith(mPropertyBag.change), "then 'FlexController.deleteChange' called with the passed change");
		assert.equal(this.oModel.getData()["variantMgmtId1"].variants[1].visible, mPropertyBag.visible, "then the parameter 'visible' updated in the VariantModel");
		assert.ok(fnSetVariantDataStub.callCount, 0, "then '_setVariantData' of VariantController not called");
		assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
	});

	QUnit.test("when calling '_setVariantProperties' for 'setDefault' to add a change", function(assert) {
		var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
		var fnAddDirtyChangeStub = sandbox.stub(this.oFlexController._oChangePersistence, "addDirtyChange");
		var mPropertyBag = {
			"changeType" : "setDefault",
			"defaultVariant" : "variant0",
			"layer" : "CUSTOMER",
			"variantManagementReference" : "variantMgmtId1",
			"appComponent" : this.oComponent
		};
		this.oModel.oVariantController._mVariantManagement = {};
		this.oModel.oVariantController._mVariantManagement["variantMgmtId1"] = {defaultVariant : this.oData["variantMgmtId1"].defaultVariant};

		var oChange = this.oModel._setVariantProperties("variantMgmtId1", mPropertyBag, true);
		assert.equal(oChange.getContent().defaultVariant, mPropertyBag.defaultVariant, "then the new change created with the parameter 'visible' in content");
		assert.equal(oChange.getChangeType(), "setDefault", "then the new change created with 'setDefault' as changeType");
		assert.equal(oChange.getFileType(), "ctrl_variant_management_change", "then the new change created with 'ctrl_variant_change' as fileType");
		assert.ok(fnAddDirtyChangeStub.calledWith(oChange), "then 'FlexController.addDirtyChange called with the newly created change");
		assert.equal(this.oModel.getData()["variantMgmtId1"].defaultVariant, mPropertyBag.defaultVariant, "then the parameter 'defaultVariant' updated in the VariantModel");
		assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
	});

	QUnit.test("when calling '_setVariantProperties' for 'setDefault' to delete a change", function(assert) {
		var fnUpdateChangesForVariantManagementInMap = sandbox.stub(this.oModel.oVariantController, "_updateChangesForVariantManagementInMap").returns(1);
		var fnChangeStub = sandbox.stub().returns({ getDefinition : function() {} });
		var fnDeleteChangeStub = sandbox.stub(this.oFlexController._oChangePersistence, "deleteChange");
		var mPropertyBag = {
				"changeType" : "setDefault",
				"defaultVariant" : "variant1",
				"variantManagementReference" : "variantMgmtId1",
				"change" : fnChangeStub()
			};
		this.oModel.oVariantController._mVariantManagement = {};
		this.oModel.oVariantController._mVariantManagement["variantMgmtId1"] = {defaultVariant : this.oData["variantMgmtId1"].defaultVariant};

		var oChange = this.oModel._setVariantProperties("variantMgmtId1", mPropertyBag, false);
		assert.notOk(oChange, "then no change returned");
		assert.ok(fnDeleteChangeStub.calledWith(mPropertyBag.change), "then 'FlexController.deleteChange' called with the passed change");
		assert.equal(this.oModel.getData()["variantMgmtId1"].defaultVariant, mPropertyBag.defaultVariant, "then the parameter 'defaultVariant' updated in the VariantModel");
		assert.ok(fnUpdateChangesForVariantManagementInMap.calledOnce, "then '_updateChangesForVariantManagementInMap' of VariantController called");
	});

	QUnit.test("when calling 'switchToVariant'", function(assert) {
		return this.oModel._switchToVariant("variantMgmtId1", "variant1")

		.then(function() {
			assert.ok(this.fnLoadSwitchChangesStub.calledOnce, "then loadSwitchChangesMapForComponent called once from ChangePersitence");
			assert.ok(this.fnRevertChangesStub.calledOnce, "then revertChangesOnControl called once in FlexController");
			assert.ok(this.fnApplyChangesStub.calledOnce, "then applyVariantChanges called once in FlexController");
		}.bind(this));
	});

	QUnit.test("when calling '_duplicateVariant' on the same layer", function(assert) {
		var oSourceVariant = {
			"content": {
				"fileName":"variant0",
				"title":"variant A",
				"fileType":"ctrl_variant",
				"variantManagementReference":"variantMgmtId1",
				"variantReference":"variant2",
				"content":{},
				"selector":{},
				"layer":"CUSTOMER",
				"namespace":"Dummy.Component"
			},
			"controlChanges": [],
			"variantChanges": {}
		};

		var mPropertyBag = {
			newVariantReference: "newVariant",
			sourceVariantReference: "variant0",
			layer: "CUSTOMER"
		};

		var oSourceVariantCopy = JSON.parse(JSON.stringify(oSourceVariant));
		oSourceVariantCopy.content.title = oSourceVariant.content.title + " Copy";
		oSourceVariantCopy.content.fileName = "newVariant";
		sandbox.stub(Utils, "isLayerAboveCurrentLayer").returns(0);
		sandbox.stub(this.oModel, "getVariant").returns(oSourceVariant);
		var oDuplicateVariant = this.oModel._duplicateVariant(mPropertyBag);
		assert.deepEqual(oDuplicateVariant, oSourceVariantCopy);
	});

	QUnit.test("when calling '_duplicateVariant' from CUSTOMER layer referencing variant on VENDOR layer", function(assert) {
		var oSourceVariant = {
			"content": {
				"fileName":"variant0",
				"title":"variant A",
				"fileType":"ctrl_variant",
				"variantManagementReference":"variantMgmtId1",
				"variantReference":"variant2",
				"content":{},
				"selector":{},
				"layer":"VENDOR",
				"namespace":"Dummy.Component"
			},
			"controlChanges": [],
			"variantChanges": {}
		};

		var mPropertyBag = {
			newVariantReference: "newVariant",
			sourceVariantReference: "variant0",
			layer: "VENDOR"
		};

		var oSourceVariantCopy = JSON.parse(JSON.stringify(oSourceVariant));
		oSourceVariantCopy.content.title = oSourceVariant.content.title + " Copy";
		oSourceVariantCopy.content.fileName = "newVariant";
		oSourceVariantCopy.content.variantReference = "variant0";
		sandbox.stub(this.oModel, "getVariant").returns(oSourceVariant);
		var oDuplicateVariant = this.oModel._duplicateVariant(mPropertyBag);
		assert.deepEqual(oDuplicateVariant, oSourceVariantCopy, "then the duplicate variant returned with customized properties");
	});

	QUnit.test("when calling '_duplicateVariant' from CUSTOMER layer with reference to a variant on VENDOR layer with one CUSTOMER and one VENDOR change", function(assert) {
		var oChangeContent0 = {"fileName":"change0", "variantReference":"variant0", "layer": "CUSTOMER", "support": {}};
		var oChangeContent1 = {"fileName":"change1", "variantReference":"variant0", "layer": "VENDOR", "support": {}};

		var oSourceVariant = {
			"content": {
				"fileName":"variant0",
				"title":"variant A",
				"fileType":"ctrl_variant",
				"variantManagementReference":"variantMgmtId1",
				"variantReference":"variant2",
				"content":{},
				"selector":{},
				"layer":"VENDOR",
				"namespace":"Dummy.Component"
			},
			"controlChanges": [oChangeContent0, oChangeContent1],
			"variantChanges": {}
		};

		var mPropertyBag = {
			newVariantReference: "newVariant",
			sourceVariantReference: "variant0",
			layer: "VENDOR"
		};

		sandbox.stub(this.oModel, "getVariant").returns(oSourceVariant);

		var oSourceVariantCopy = JSON.parse(JSON.stringify(oSourceVariant));
		var oDuplicateVariant = this.oModel._duplicateVariant(mPropertyBag);
		oSourceVariantCopy.content.title = oSourceVariant.content.title + " Copy";
		oSourceVariantCopy.content.fileName = "newVariant";
		oSourceVariantCopy.content.variantReference = "variant0";
		oSourceVariantCopy.controlChanges.splice(1, 1);

		oSourceVariantCopy.controlChanges.forEach( function (oCopiedChange, iIndex) {
			oCopiedChange.variantReference = "newVariant";
			oCopiedChange.support.sourceChangeFileName = oSourceVariant.controlChanges[iIndex].fileName;
			oSourceVariantCopy.controlChanges[iIndex].fileName = oDuplicateVariant.controlChanges[iIndex].fileName; /*mock*/
		});

		assert.deepEqual(oDuplicateVariant, oSourceVariantCopy, "then the duplicate variant returned with customized properties");
		assert.equal(oDuplicateVariant.controlChanges.length, 1, "then only one change duplicated");
		assert.equal(oDuplicateVariant.controlChanges[0].layer, Utils.getCurrentLayer(), "then only one change duplicated");
		assert.equal(oDuplicateVariant.content.variantReference, oSourceVariant.content.fileName, "then the duplicate variant has reference to the source variant from VENDOR layer");
	});

	QUnit.test("when calling '_duplicateVariant' from CUSTOMER layer with reference to a variant on the same layer", function(assert) {
		var oChangeContent0 = {"fileName":"change0", "variantReference":"variant0", "layer": "CUSTOMER", "support": {}};
		var oChangeContent1 = {"fileName":"change1", "variantReference":"variant0", "layer": "CUSTOMER", "support": {}};

		var oSourceVariant = {
			"content": {
				"fileName":"variant0",
				"title":"variant A",
				"fileType":"ctrl_variant",
				"variantManagementReference":"variantMgmtId1",
				"variantReference":"variant2",
				"content":{},
				"selector":{},
				"layer":"CUSTOMER",
				"namespace":"Dummy.Component"
			},
			"controlChanges": [oChangeContent0, oChangeContent1],
			"variantChanges": {}
		};

		var mPropertyBag = {
			newVariantReference: "newVariant",
			sourceVariantReference: "variant0",
			layer: "CUSTOMER"
		};

		sandbox.stub(this.oModel, "getVariant").returns(oSourceVariant);

		var oDuplicateVariant = this.oModel._duplicateVariant(mPropertyBag);
		var oSourceVariantCopy = JSON.parse(JSON.stringify(oSourceVariant));
		oSourceVariantCopy.content.title = oSourceVariant.content.title + " Copy";
		oSourceVariantCopy.content.fileName = "newVariant";

		oSourceVariantCopy.controlChanges.forEach( function (oCopiedChange, iIndex) {
			oCopiedChange.variantReference = "newVariant";
			oCopiedChange.support.sourceChangeFileName = oSourceVariant.controlChanges[iIndex].fileName;
			oSourceVariantCopy.controlChanges[iIndex].fileName = oDuplicateVariant.controlChanges[iIndex].fileName; /*mock*/
		});

		assert.deepEqual(oDuplicateVariant, oSourceVariantCopy, "then the duplicate variant returned with customized properties");
		assert.equal(oDuplicateVariant.controlChanges.length, 2, "then both changes duplicated");
		assert.equal(oDuplicateVariant.content.variantReference, oSourceVariant.content.variantReference, "then the duplicate variant references to the reference of the source variant");
		assert.equal(oDuplicateVariant.controlChanges[0].support.sourceChangeFileName , oChangeContent0.fileName, "then first duplicate variant change's support.sourceChangeFileName property set to source change's fileName");
		assert.equal(oDuplicateVariant.controlChanges[1].support.sourceChangeFileName , oChangeContent1.fileName, "then second duplicate variant change's support.sourceChangeFileName property set to source change's fileName");
	});

	QUnit.test("when calling '_copyVariant'", function(assert) {
		var fnAddVariantToControllerStub = sandbox.stub(this.oModel.oVariantController, "addVariantToVariantManagement").returns(3);
		var oVariantData = {
			"content": {
				"fileName":"variant0",
					"title":"variant A",
					"fileType":"ctrl_variant",
					"variantManagementReference":"variantMgmtId1",
					"variantReference":"",
					"reference":"Dummy.Component",
					"packageName":"$TMP",
					"content":{},
				"selector":{},
				"layer":"CUSTOMER",
					"texts":{
					"TextDemo": {
						"value": "Text for TextDemo",
							"type": "myTextType"
					}
				},
				"namespace":"Dummy.Component",
					"creation":"",
					"originalLanguage":"EN",
					"conditions":{},
				"support":{
					"generator":"Change.createInitialFileContent",
						"service":"",
						"user":""
				}
			},
			"controlChanges": []
		};
		sandbox.stub(this.oModel, "_duplicateVariant").returns(oVariantData);
		sandbox.stub(BaseTreeModifier, "getSelector").returns({id: "variantMgmtId1"});
		sandbox.stub(this.oModel.oFlexController._oChangePersistence, "addDirtyChange");

		var mPropertyBag = {};
		return this.oModel._copyVariant(mPropertyBag).then( function (oVariant) {
			assert.ok(fnAddVariantToControllerStub.calledOnce, "then function to add variant to VariantController called");
			assert.equal(this.oModel.oData["variantMgmtId1"].variants[3].key, oVariantData.content.fileName, "then variant added to VariantModel");
			assert.equal(oVariant.getId(), oVariantData.content.fileName, "then the returned variant is the duplicate variant");
		}.bind(this));
	});

	QUnit.test("when calling '_removeVariant'", function(assert) {
		var fnDeleteChangeStub = sandbox.stub(this.oModel.oFlexController._oChangePersistence, "deleteChange");
		var oChangeInVariant = {
			"fileName": "change0",
			"variantReference": "variant0",
			"layer": "VENDOR",
			getId: function () {
				return this.fileName;
			},
			getVariantReference: function() {
				return this.variantReference;
			}
		};
		var oVariant = {
			"fileName": "variant0",
			getId: function() {
				return this.fileName;
			}
		};
		var aDummyDirtyChanges = [oVariant].concat(oChangeInVariant);
		sandbox.stub(this.oModel.oFlexController._oChangePersistence, "getDirtyChanges").returns(aDummyDirtyChanges);
		var fnRemoveVariantToControllerStub = sandbox.stub(this.oModel.oVariantController, "removeVariantFromVariantManagement").returns(2);

		assert.equal(this.oModel.oData["variantMgmtId1"].variants.length, 3, "then initial length is 3");

		return this.oModel._removeVariant(oVariant, "", "variantMgmtId1").then( function () {
			assert.equal(this.oModel.oData["variantMgmtId1"].variants.length, 2, "then one variant removed from VariantModel");
			assert.ok(fnRemoveVariantToControllerStub.calledOnce, "then function to remove variant from VariantController called");
			assert.ok(fnDeleteChangeStub.calledTwice, "then ChangePersistence.deleteChange called twice");
			assert.ok(fnDeleteChangeStub.calledWith(oChangeInVariant), "then ChangePersistence.deleteChange called for change in variant");
			assert.ok(fnDeleteChangeStub.calledWith(oVariant), "then ChangePersistence.deleteChange called for variant");
		}.bind(this));
	});

	QUnit.test("when calling 'collectModelChanges'", function(assert) {
		this.oModel.getData()["variantMgmtId1"].variants[1].title = "test";
		this.oModel.getData()["variantMgmtId1"].variants[1].favorite = false;
		this.oModel.getData()["variantMgmtId1"].variants[1].visible = false;
		this.oModel.getData()["variantMgmtId1"].defaultVariant = "variant0";

		var aChanges = this.oModel.collectModelChanges("variantMgmtId1", "CUSTOMER");
		assert.equal(aChanges.length, 4, "then 4 changes with mPropertyBags were created");
	});

	QUnit.test("when calling 'manageVariants'", function(assert) {
		var done = assert.async();
		var oVariantManagement = new VariantManagement("variantMgmtId1");
		oVariantManagement.setModel(this.oModel, "$FlexVariants");
		sandbox.stub(oVariantManagement, "openManagementDialog", oVariantManagement.fireManage);

		this.oModel.getData()["variantMgmtId1"].variants[1].title = "test";
		this.oModel.getData()["variantMgmtId1"].variants[1].favorite = false;
		this.oModel.getData()["variantMgmtId1"].variants[1].visible = false;
		this.oModel.getData()["variantMgmtId1"].defaultVariant = "variant0";

		this.oModel.manageVariants(oVariantManagement, "variantMgmtId1", "CUSTOMER").then(function(aChanges) {
			assert.equal(aChanges.length, 4, "then 4 changes with mPropertyBags were created");
			done();
		});
	});

	QUnit.module("Given an instance of FakeLrepConnector with no Variants in the LREP response", {
		beforeEach : function(assert) {
			this.oData = {};

			var oManifestObj = {
				"sap.app": {
					id: "MyComponent",
					"applicationVersion": {
						"version": "1.2.3"
					}
				}
			};
			var oManifest = new sap.ui.core.Manifest(oManifestObj);
			var oComponent = {
				name: "MyComponent",
				appVersion: "1.2.3",
				getId: function() {
					return "RTADemoAppMD";
				},
				getManifestObject: function() {
					return oManifest;
				}
			};
			sandbox.stub(Utils, "getComponentClassName").returns("MyComponent");

			this.oFlexController = FlexControllerFactory.createForControl(oComponent, oManifest);
			this.fnLoadSwitchChangesStub = sandbox.stub(this.oFlexController._oChangePersistence, "loadSwitchChangesMapForComponent").returns({aRevert:[], aNew:[]});
			this.fnRevertChangesStub = sandbox.stub(this.oFlexController, "revertChangesOnControl");
			this.fnApplyChangesStub = sandbox.stub(this.oFlexController, "applyVariantChanges");

			this.oModel = new VariantModel(this.oData, this.oFlexController, oComponent);
		},
		afterEach : function(assert) {
			sandbox.restore();
			delete this.oFlexController;
		}
	});

	QUnit.test("when calling 'ensureStandardEntryExists'", function(assert) {
		this.oModel.ensureStandardEntryExists("varMgmtRef1");
		assert.equal(this.oModel.getCurrentVariantReference("varMgmtRef1"), "varMgmtRef1", "then the Current Variant is set to the standard variant");
	});

});
