var Galeria = SuperWidget.extend({
    instanceId: this.instanceId,
    widgetVersion: null,
    sourceType: null,
    applicationSourceClientID: null,
    fluigDirectoryName: null,
    fluigDirectoryID: 309,
    showImageTitle: null,
    autoSize: false,
    resize: false,
    mapAttrs: {
        TYPE_FLUIGDIR: 'FluigDir',
        ERROR_TYPE_API_NOT_ALLOWED: 'APINotAllowedError',
        ERROR_TYPE_API_INVALID_CLIENT: 'OAuthParameterException',
        LIMIT_CHAR_MESSAGE: 119
    },

    bindings: {
        local: {
            'option-fluigdir': ['click_fluigDirChosen'],
            'usedefault-clientid': ['click_useDefaultClientID'],
            'save-preferences': ['click_savePreferences'],
            'find-fluigdir': ['click_chooseDirectory']
        },
        global: {}
    },

    init: function () {
        var that = this;
        if (that.isEditMode) {
            that.editMode();
        } else {
            that.viewMode();
        }
    },

    definePreferences: function () {
        var mode = this.getMode();
        this.sourceType = $('#sourceType' + mode).val();
        this.applicationSourceClientID = $('#applicationSourceClientID' + mode).val();
        this.fluigDirectoryID = $('#fluigDirectoryID' + mode).val();
        this.fluigDirectoryName = $('#fluigDirectoryName' + mode).val();
        this.showImageTitle = $('#showImageTitle' + mode).prop('checked');
        this.autoSize = $("#autoSize" + mode).prop('checked');
        this.resize = $("#resize" + mode).prop('checked');
    },

    getMode: function () {
       return ((this.isEditMode) ? 'Edit' : 'View') + '_' + this.instanceId;
    },

    setDirectory: function (doc) {
        var mode = this.getMode();

        this.fluigDirectoryID = doc.documentId;
        $('#fluigDirectoryID' + mode).val(this.fluigDirectoryID);

        this.fluigDirectoryName = doc.documentDescription;
        $('#fluigDirectoryName' + mode).val(this.fluigDirectoryName);
    },

    viewMode: function () {
        this.getFluigImageReader();
    },

    loadFluigImages: function (data) {
        var that = this, images = [], len = data.length, item, image;
        for (var i = 0; i < len; i++) {
            item = data[i];
            //if (item.mimetype && that.validateMimeType(item)) {}
            image = {
                src: that.getFluigFileUrl(item),
                ecmLink: that.getFluigFileECM(item),
                linkhref: that.getFluigFileECMDownload(item),
                author: item.colleagueId,
                title: (/^true$/i.test(that.showImageTitle)) ? that.cropMessage(that.getFluigFileDescription(item))
                    : '',
                alt: that.getFluigFileDescription(item),
                mimetype: item.mimetype
            };
            images.push(image);
        }
        if (images.length > 0) {
            that.buildGaleria(images);
        } else {
            this.displayNoDataFoundMessage();
        }
    },

    validateMimeType: function (item) {
        var mimeTypes = ['image/jpeg', 'image/bmp', 'image/x-windows-bmp', 'image/pjpeg', 'image/png', 'image/gif'];
        for (var index in mimeTypes) {
            var mime = mimeTypes[index];
            if (item.mimetype === mime) {
                return true;
            }
        }
        return false;
    },

    buildGaleria: function (images) {
        if (images && images.length) {             
            var tpl = $('.tpl-continuous-scroll').html(),
                html,
                items = { items: images };
            html = Mustache.render(tpl, items);
            $('[data-galeria]').html(html);

        } else {
            this.showMessage('', 'warning', '${i18n.getTranslation("kit_Galeria.error.nodatatodisplay")}');
        }
    },

    getFluigFileECM: function (item) {
        return WCMAPI.tenantURL + '/ecmnavigation?app_ecm_navigation_doc=' + item['documentPK.documentId'];
    },

    getFluigFileECMDownload: function (item) {
        var nrDocto = item['documentPK.documentId'];
        var nrVersao = item['documentPK.version'];
        var companyId = item['documentPK.companyId']; 
        return WCMAPI.getServerURL() + '/webdesk/streamcontrol/' + item.phisicalFile + '?WDNrDocto=' + nrDocto
                + '&WDNrVersao=' + nrVersao + '&WDCompanyId=' + companyId
    },

    getFluigFileUrl: function (item) {
        var that = this;
        var nrDocto = item['documentPK.documentId'];
        var nrVersao = item['documentPK.version'];
        var companyId = item['documentPK.companyId'];   
    
        var fluigFileUrl = (item.iconId === 0 && !item.mimetype) ? "/webdesk/icone/23.png" : "/webdesk/icone/10.png";
        if(item.mimetype && that.validateMimeType(item)){
            fluigFileUrl = WCMAPI.getServerURL() + '/webdesk/streamcontrol/' + item.phisicalFile + '?WDNrDocto=' + nrDocto
                + '&WDNrVersao=' + nrVersao + '&WDCompanyId=' + companyId
        }
        return fluigFileUrl
    },

    getFluigFileDescription: function (item) {
        if (item.additionalComments) {
            return item.additionalComments;
        }
        return item.documentDescription;
    },

    editMode: function () {
        if (this.sourceType === this.mapAttrs.TYPE_FLUIGDIR) {
            this.fluigDirChosen();
        }
    },

    savePreferences: function () {
        var that = this;
        that.definePreferences();
        that.save(that.getPreferences());
    },

    parseError: function (response) {
        var that = this;
        switch (response.meta.error_type) {
            case that.mapAttrs.ERROR_TYPE_API_NOT_ALLOWED:
                return '${i18n.getTranslation("kit_Galeria.error.apinotallowed")}';
            case that.mapAttrs.ERROR_TYPE_API_INVALID_CLIENT:
                return '${i18n.getTranslation("kit_Galeria.error.invalidclientid")}';
            default:
                return response.meta.error_message;
        }
    },

    getFluigImageReader: function () {
        var constraints = [], dataset;
        constraints.push(DatasetFactory.createConstraint('parentDocumentId', this.fluigDirectoryID, this.fluigDirectoryID, ConstraintType.MUST));
        constraints.push(DatasetFactory.createConstraint('activeVersion', true, true, ConstraintType.MUST));
        constraints.push(DatasetFactory.createConstraint('documentPK.companyId', WCMAPI.getTenantId(), WCMAPI.getTenantId(), ConstraintType.MUST));

        dataset = DatasetFactory.getDataset('document', null, constraints, null);

        if (dataset && dataset.values.length > 0) {
            var docId = dataset.values[0].uUID;
            if (docId || docId.length) {
                this.loadFluigImages(dataset.values);
            } else {
                this.displayNoDataFoundMessage();
            }
        } else {
            this.displayNoDataFoundMessage();
        }
    },

    displayNoDataFoundMessage: function () {
        var that = this;
        that.error = '${i18n.getTranslation("kit_Galeria.error.nodatatodisplay")}'
        var tpl = $('.tpl-continuous-scroll').html(),
        html,
        items = { error: that.error };
        html = Mustache.render(tpl, items);
        $('[data-galeria]').html(html);
    },

    save: function (preferences) {
        var that = this;
        if (that.sourceType === that.mapAttrs.TYPE_FLUIGDIR && preferences.fluigDirectoryName === ''
            && preferences.fluigDirectoryID === '') {
            that.showMessageError('', '${i18n.getTranslation("kit_Galeria.edit.error.atleastone")}');
        } else {
            WCMSpaceAPI.PageService.UPDATEPREFERENCES({
                async: true,
                success: function (data) {
                    FLUIGC.toast({
                        title: data.message,
                        message: '',
                        type: 'success'
                    });
                },
                fail: function (xhr, message, errorData) {
                    that.showMessageError('', errorData.message);
                }
            }, that.instanceId, preferences);
        }
    },

    showMessageError: function (title, error) {
        this.showMessage(title, 'danger', error);
    },

    showMessage: function (title, type, message) {
        FLUIGC.toast({
            title: title,
            type: type,
            message: message
        });
    },

    getPreferences: function () {
        return {
            sourceType: this.sourceType,
            applicationSourceClientID: this.applicationSourceClientID,
            fluigDirectoryID: this.fluigDirectoryID,
            fluigDirectoryName: this.fluigDirectoryName,
            showImageTitle: this.showImageTitle,
            autoSize: this.autoSize,
            resize: this.resize
        };
    },

    fluigDirChosen: function () {
        this.chooseSourceType(this.mapAttrs.TYPE_FLUIGDIR);
    },

    chooseSourceType: function (type) {
        var $optionButton = $('#sourceTypeButton_' + this.instanceId);
        var displayFluigDirData = null;
        $('#sourceType' + this.getMode()).val(type);
        this.sourceType = type;
        if (type === this.mapAttrs.TYPE_FLUIGDIR) {
            $optionButton.text('${i18n.getTranslation("kit_Galeria.source.fluigdir")}' + ' ');
            displayFluigDirData = '';
            $("#showImageTitleEdit_" + this.instanceId).removeClass('fs-display-none');
        }
        $("#formFluigDir_" + this.instanceId).attr('style', 'display: ' + displayFluigDirData + ';');
        $('<span>').addClass('caret').appendTo($optionButton);
    },

    chooseDirectory: function () {
        var that = this;

        ECMBC.searchDocument({
            showPrivate: false,
            showCheckOutDocs: false,
            selectableDocTypeId: '1',
            title: '${i18n.getTranslation("kit_Galeria.edit.copyPhisicalFile.title")}',
            height: "calc(100vh - 138px)" // 138px é a soma da altura do header/footer/margens da modal
        }, function (err, document) {
            if (err) {
                FLUIGC.message.alert({
                    message: '${i18n.getTranslation("kit_Galeria.error.loaddirectories")}',
                    title: '${i18n.getTranslation("kit_Galeria.source.ecmdir")}',
                    label: '${i18n.getTranslation("kit_Galeria.label.close")}'
                });
                return false;
            }

            that.setDirectory(document);
        });
    },

    cropMessage: function (message) {
        var croppedMessage = '';
        if (message.length > this.mapAttrs.LIMIT_CHAR_MESSAGE) {
            croppedMessage = message.substring(0, this.mapAttrs.LIMIT_CHAR_MESSAGE);
            croppedMessage = croppedMessage.concat("...");
        } else {
            croppedMessage = message;
        }

        return croppedMessage;
    }
});

